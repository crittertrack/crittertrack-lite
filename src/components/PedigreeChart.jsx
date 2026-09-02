import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X, Mars, Venus, Download, Image as ImageIcon, Loader2, Cat } from 'lucide-react';
import AnimalImage from './shared/AnimalImage';
import { formatDate } from '../utils/dateFormatter';
import { getVariety } from '../utils/variety';

// Mobile re-implementation of crittertrack-frontend's PedigreeChart (AnimalForm/index.jsx) —
// same certificate frame/grid/cell layout plus breeder-name lookups and litter-pairing
// certificates, minus the desktop-only vertical view and custom text/color/background-image panel.
const MAX_DEPTH = 4;
const CERT_BORDER_COLOR = '#374151';
const CERT_FONT_COLOR = '#111827';

// Resolves the display name for an ancestor's breeder from their public profile,
// honoring the breeder's own showPersonalName/showBreederName privacy settings.
const resolveBreederName = async (animalInfo, API_BASE_URL) => {
    if (animalInfo.manualBreederName) {
        animalInfo.breederName = animalInfo.manualBreederName;
        return;
    }
    if (!animalInfo.breederId_public) return;
    try {
        const res = await axios.get(`${API_BASE_URL}/public/profiles/search?query=${animalInfo.breederId_public}&limit=1`);
        const breeder = res.data?.[0];
        if (!breeder) return;
        const showPersonalName = breeder.showPersonalName ?? false;
        const showBreederName = breeder.showBreederName ?? false;
        if (showBreederName && showPersonalName && breeder.personalName && breeder.breederName) {
            animalInfo.breederName = `${breeder.personalName} (${breeder.breederName})`;
        } else if (showBreederName && breeder.breederName) {
            animalInfo.breederName = breeder.breederName;
        } else if (showPersonalName && breeder.personalName) {
            animalInfo.breederName = breeder.personalName;
        } else {
            animalInfo.breederName = 'Anonymous Breeder';
        }
    } catch {
        // leave breederName unset if the lookup fails
    }
};

const fetchAnimalWithFamily = async (id, API_BASE_URL, authToken, depth = 0, cache = new Map()) => {
    if (!id || depth > MAX_DEPTH) return null;
    if (cache.has(id)) return cache.get(id);
    let animalInfo = null;
    try {
        const res = await axios.get(`${API_BASE_URL}/animals/any/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        animalInfo = res.data;
    } catch {
        return null;
    }
    if (!animalInfo) return null;
    await resolveBreederName(animalInfo, API_BASE_URL);
    const sireId = animalInfo.sireId_public || animalInfo.fatherId_public;
    const damId = animalInfo.damId_public || animalInfo.motherId_public;
    const [father, mother] = await Promise.all([
        sireId ? fetchAnimalWithFamily(sireId, API_BASE_URL, authToken, depth + 1, cache) : null,
        damId ? fetchAnimalWithFamily(damId, API_BASE_URL, authToken, depth + 1, cache) : null,
    ]);
    const result = { ...animalInfo, father, mother };
    cache.set(id, result);
    return result;
};

// Builds a synthetic "subject" for a litter/breeding-pair certificate — same shape as a normal
// animal's ancestor tree, but father/mother are the litter's sire/dam trees directly (matching
// the main site's litterId branch in AnimalForm/index.jsx).
const fetchLitterWithFamily = async (litterId, API_BASE_URL, authToken, currentUserIdPublic) => {
    let litterInfo = null;
    try {
        const res = await axios.get(`${API_BASE_URL}/litters/${litterId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        litterInfo = res.data;
    } catch {
        return null;
    }
    if (!litterInfo) return null;
    const [sireTree, damTree] = await Promise.all([
        litterInfo.sireId_public ? fetchAnimalWithFamily(litterInfo.sireId_public, API_BASE_URL, authToken) : null,
        litterInfo.damId_public ? fetchAnimalWithFamily(litterInfo.damId_public, API_BASE_URL, authToken) : null,
    ]);
    return {
        id_public: litterInfo.litter_id_public || litterId,
        isLitterRoot: true,
        litterInfo,
        species: sireTree?.species || damTree?.species || null,
        father: sireTree,
        mother: damTree,
        breederId_public: currentUserIdPublic || null,
    };
};

const getAncestor = (root, path) => {
    let node = root;
    for (const step of path) {
        if (!node) return null;
        node = node[step];
    }
    return node || null;
};

// Builds the per-generation ancestor slot list, e.g. genSlots[0] = parents,
// genSlots[1] = grandparents, doubling each generation — same as the main site.
const buildGenSlots = (gens) => {
    const genSlots = [];
    genSlots[0] = [
        { path: ['father'], isSire: true },
        { path: ['mother'], isSire: false },
    ];
    for (let g = 1; g < gens; g++) {
        genSlots[g] = [];
        for (const slot of genSlots[g - 1]) {
            genSlots[g].push({ path: [...slot.path, 'father'], isSire: true });
            genSlots[g].push({ path: [...slot.path, 'mother'], isSire: false });
        }
    }
    return genSlots;
};

// genIndex: 0 = parents (largest), 1 = grandparents, 2 = great-grandparents, 3 = great-great (smallest)
const getCellSizing = (genIndex, stacked) => {
    const imgSize = stacked
        ? (genIndex === 0 ? 70 : genIndex === 1 ? 50 : 0)
        : (genIndex === 0 ? 90 : genIndex === 1 ? 60 : genIndex === 2 ? 38 : 0);
    const nameSize = genIndex === 0 ? '0.90rem' : genIndex === 1 ? '0.78rem' : genIndex === 2 ? '0.66rem' : '0.58rem';
    const metaSize = genIndex === 0 ? '0.76rem' : genIndex === 1 ? '0.68rem' : genIndex === 2 ? '0.58rem' : '0.51rem';
    const smallSize = genIndex === 0 ? '0.66rem' : genIndex === 1 ? '0.58rem' : genIndex === 2 ? '0.51rem' : '0.46rem';
    let iconSize = genIndex === 0 ? 26 : genIndex === 1 ? 22 : genIndex === 2 ? 20 : 18;
    if (stacked && genIndex >= 2) iconSize = genIndex === 2 ? 18 : 16;
    const pad = genIndex === 0 ? '6px 8px' : genIndex === 1 ? '5px 7px' : genIndex === 2 ? '4px 6px' : '3px 5px';
    return { imgSize, nameSize, metaSize, smallSize, iconSize, pad };
};

const Cell = ({ animal, isSire, onClick, genIndex = 0, stacked = false }) => {
    const { imgSize, nameSize, metaSize, smallSize, iconSize, pad } = getCellSizing(genIndex, stacked);
    const borderColor = !animal ? (isSire ? '#79a9ff' : '#f48abf')
        : animal.gender === 'Male' ? '#3b82f6'
        : animal.gender === 'Female' ? '#f48abf'
        : (isSire ? '#79a9ff' : '#f48abf');
    const bgColor = !animal ? (isSire ? '#e8f1ff' : '#fdeef6')
        : animal.gender === 'Male' ? '#e8f1ff'
        : animal.gender === 'Female' ? '#fdeef6'
        : (isSire ? '#e8f1ff' : '#fdeef6');
    const GenderIcon = isSire ? Mars : Venus;
    const baseStyle = { border: `1px solid ${borderColor}`, backgroundColor: bgColor, padding: pad, position: 'relative', height: '100%', boxSizing: 'border-box', borderRadius: 6, overflow: 'hidden', cursor: onClick && animal ? 'pointer' : 'default' };

    if (!animal) {
        return (
            <div style={baseStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ fontSize: metaSize, color: '#9ca3af', textAlign: 'center' }}>Unknown</div>
                </div>
                <div style={{ position: 'absolute', top: 2, right: 2 }}><GenderIcon size={iconSize} color={CERT_BORDER_COLOR} /></div>
            </div>
        );
    }

    const imgSrc = animal.imageUrl || animal.photoUrl || null;
    const variety = getVariety(animal);
    const fullName = [animal.prefix, animal.name, animal.suffix].filter(Boolean).join(' ');
    const handleClick = onClick && animal.id_public ? () => onClick(animal) : undefined;
    const isRowLayout = (genIndex === 2 && !stacked) || (stacked && (genIndex === 0 || genIndex === 1));
    const isLast = genIndex === 3;

    return (
        <div style={baseStyle} onClick={handleClick}>
            <div style={{ display: 'flex', flexDirection: isRowLayout ? 'row' : 'column', gap: imgSize > 0 ? 6 : 0, alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                {imgSrc && imgSize > 0 && (
                    <div style={{ width: imgSize, height: imgSize, flexShrink: 0, borderRadius: 4, overflow: 'hidden', border: `1px solid ${CERT_BORDER_COLOR}` }}>
                        <AnimalImage src={imgSrc} alt={fullName} className="w-full h-full object-cover" iconSize={Math.round(imgSize * 0.4)} />
                    </div>
                )}
                <div style={{ minWidth: 0, width: isRowLayout ? `calc(100% - ${imgSize}px - 6px)` : '100%', textAlign: (stacked && (genIndex === 0 || genIndex === 1)) ? 'left' : 'center', paddingLeft: isRowLayout ? 4 : 0, paddingRight: isLast ? 0 : 16, paddingBottom: isLast ? 0 : 10, overflowWrap: 'break-word' }}>
                    {isLast ? (
                        stacked ? (
                            <>
                                <div style={{ fontSize: '0.54rem', fontWeight: 700, color: CERT_FONT_COLOR, lineHeight: 1.05, overflowWrap: 'anywhere', padding: '0 18px 0 4px' }}>{fullName}</div>
                                {variety && <div style={{ fontSize: '0.47rem', color: CERT_FONT_COLOR, lineHeight: 1.05, overflowWrap: 'anywhere', padding: '0 18px 0 4px' }}>{variety}</div>}
                                {animal.birthDate && <div style={{ fontSize: '0.47rem', color: CERT_FONT_COLOR, lineHeight: 1.05, padding: '0 18px 0 4px' }}>{formatDate(animal.birthDate)}</div>}
                                {animal.breederName && animal.breederName !== 'Anonymous Breeder' && <div style={{ fontSize: '0.42rem', color: CERT_FONT_COLOR, fontStyle: 'italic', lineHeight: 1.05, overflowWrap: 'anywhere', padding: '0 18px 0 4px' }}>{animal.breederName}</div>}
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: nameSize, fontWeight: 700, color: CERT_FONT_COLOR, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 20px 0 4px' }}>{fullName}{variety ? <span style={{ fontWeight: 400, marginLeft: 4 }}>· {variety}</span> : null}</div>
                                {animal.birthDate && <div style={{ fontSize: metaSize, color: CERT_FONT_COLOR, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 20px 0 4px' }}>{formatDate(animal.birthDate)}</div>}
                                {animal.breederName && animal.breederName !== 'Anonymous Breeder' && <div style={{ fontSize: smallSize, color: CERT_FONT_COLOR, fontStyle: 'italic', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 20px 0 4px' }}>{animal.breederName}</div>}
                            </>
                        )
                    ) : (
                        <>
                            <div style={{ fontSize: nameSize, fontWeight: 700, color: CERT_FONT_COLOR, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{fullName || '—'}</div>
                            {variety && <div style={{ fontSize: metaSize, color: CERT_FONT_COLOR, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{variety}</div>}
                            {animal.geneticCode && <div style={{ fontSize: metaSize, color: CERT_FONT_COLOR, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{animal.geneticCode}</div>}
                            {animal.birthDate && <div style={{ fontSize: metaSize, color: CERT_FONT_COLOR, lineHeight: 1.2 }}>{formatDate(animal.birthDate)}</div>}
                            {animal.breederName && animal.breederName !== 'Anonymous Breeder' && <div style={{ fontSize: smallSize, color: CERT_FONT_COLOR, fontStyle: 'italic', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{animal.breederName}</div>}
                        </>
                    )}
                </div>
            </div>
            <div style={{ position: 'absolute', top: 2, right: 2 }}><GenderIcon size={iconSize} color={CERT_BORDER_COLOR} /></div>
            {animal.id_public && <div style={{ position: 'absolute', bottom: 4, right: 4, fontSize: smallSize, color: '#6b7280', fontFamily: 'monospace', fontWeight: 600, lineHeight: 1 }}>{animal.id_public}</div>}
        </div>
    );
};

// Litter/pairing certificate's main card — litter stats instead of a single animal's details.
const LitterMainCard = ({ litter }) => {
    const idLabel = [litter.litter_id_public, litter.breedingPairCodeName].filter(Boolean).join(' · ');
    const totalBorn = litter.litterSizeBorn ?? litter.numberBorn ?? null;
    return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', backgroundColor: '#f3e8ff', border: '1px solid #7c3aed', borderRadius: 6, padding: '8px 12px 20px 12px', boxSizing: 'border-box', position: 'relative' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}><span style={{ fontSize: '0.9rem', fontWeight: 700, color: CERT_FONT_COLOR }}>{idLabel || 'Litter'}</span></div>
                <table style={{ borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                    <tbody>
                        <tr>
                            <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Birth:</td>
                            <td style={{ color: CERT_FONT_COLOR }}>{litter.birthDate ? formatDate(litter.birthDate) : '—'}</td>
                        </tr>
                        {litter.matingDate && (
                            <tr>
                                <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Mated:</td>
                                <td style={{ color: CERT_FONT_COLOR }}>{formatDate(litter.matingDate)}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>COI:</td>
                            <td style={{ color: CERT_FONT_COLOR }}>{litter.inbreedingCoefficient != null ? `${litter.inbreedingCoefficient.toFixed(2)}%` : '—'}</td>
                        </tr>
                        <tr>
                            <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Born:</td>
                            <td style={{ color: CERT_FONT_COLOR }}>
                                {totalBorn != null ? totalBorn : '—'}
                                {(litter.maleCount != null || litter.femaleCount != null || litter.unknownCount != null) && (
                                    <span style={{ marginLeft: 6 }}>
                                        <span style={{ color: '#3b82f6', fontWeight: 700 }}>{litter.maleCount ?? 0}M</span>
                                        {' / '}
                                        <span style={{ color: '#ec4899', fontWeight: 700 }}>{litter.femaleCount ?? 0}F</span>
                                        {' / '}
                                        <span style={{ color: '#7c3aed', fontWeight: 700 }}>{litter.unknownCount ?? 0}U</span>
                                    </span>
                                )}
                            </td>
                        </tr>
                        {litter.litterSizeWeaned != null && (
                            <tr>
                                <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Weaned:</td>
                                <td style={{ color: CERT_FONT_COLOR }}>{litter.litterSizeWeaned}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MainCard = ({ animal }) => {
    if (!animal) return null;
    if (animal.isLitterRoot) return <LitterMainCard litter={animal.litterInfo || {}} />;
    const imgSrc = animal.imageUrl || animal.photoUrl || null;
    const variety = getVariety(animal);
    const fullName = [animal.prefix, animal.name, animal.suffix].filter(Boolean).join(' ');
    const isMale = animal.gender === 'Male';
    const isFemale = animal.gender === 'Female';
    const GenderIcon = isMale ? Mars : Venus;
    const cardBg = isMale ? '#e8f1ff' : isFemale ? '#fdeef6' : '#f3f4f6';
    const cardBorder = isMale ? '#3b82f6' : isFemale ? '#f48abf' : CERT_BORDER_COLOR;

    return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', backgroundColor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 6, padding: '8px 12px 20px 12px', boxSizing: 'border-box', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 4, right: 6 }}><GenderIcon size={22} color={CERT_BORDER_COLOR} /></div>
            <div style={{ width: 90, height: 90, flexShrink: 0, overflow: 'hidden', borderRadius: 8, border: `2px solid ${CERT_BORDER_COLOR}`, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imgSrc ? <AnimalImage src={imgSrc} alt={fullName} className="w-full h-full object-cover" iconSize={36} /> : <Cat size={36} style={{ color: '#9ca3af' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}><span style={{ fontSize: '0.9rem', fontWeight: 700, color: CERT_FONT_COLOR }}>{fullName}</span></div>
                <table style={{ borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                    <tbody>
                        <tr>
                            <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Variation:</td>
                            <td style={{ color: CERT_FONT_COLOR, wordBreak: 'break-word' }}>{variety || '—'}</td>
                        </tr>
                        {animal.geneticCode && (
                            <tr>
                                <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Genotype:</td>
                                <td style={{ color: CERT_FONT_COLOR, fontFamily: 'monospace', wordBreak: 'break-word' }}>{animal.geneticCode}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Birth:</td>
                            <td style={{ color: CERT_FONT_COLOR }}>{animal.birthDate ? formatDate(animal.birthDate) : '—'}</td>
                        </tr>
                        {animal.deceasedDate && (
                            <tr>
                                <td style={{ color: '#dc2626', paddingRight: 6, fontWeight: 600, paddingBottom: 2 }}>Deceased:</td>
                                <td style={{ color: '#dc2626' }}>{formatDate(animal.deceasedDate)}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ color: '#6b7280', paddingRight: 6, whiteSpace: 'nowrap', fontWeight: 600, paddingBottom: 2 }}>Breeder:</td>
                            <td style={{ color: CERT_FONT_COLOR, wordBreak: 'break-word' }}>{(animal.breederName && animal.breederName !== 'Anonymous Breeder') ? animal.breederName : '—'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {animal.id_public && <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: '0.62rem', color: '#6b7280', fontFamily: 'monospace', fontWeight: 600 }}>{animal.id_public}</div>}
        </div>
    );
};

const PedigreeChart = ({ animalId, litterId = null, currentUserIdPublic = null, API_BASE_URL, authToken, onClose, onViewAnimal }) => {
    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generations, setGenerations] = useState(4);
    const [isSaving, setIsSaving] = useState(false);
    const chartRef = useRef(null);

    const load = useCallback(async (id) => {
        setLoading(true);
        const data = (litterId && id === litterId)
            ? await fetchLitterWithFamily(id, API_BASE_URL, authToken, currentUserIdPublic)
            : await fetchAnimalWithFamily(id, API_BASE_URL, authToken);
        setSubject(data);
        setLoading(false);
    }, [API_BASE_URL, authToken, litterId, currentUserIdPublic]);

    useEffect(() => { load(litterId || animalId); }, [animalId, litterId, load]);

    const handleCardClick = (clickedAnimal) => {
        if (!clickedAnimal?.id_public) return;
        if (onViewAnimal) onViewAnimal(clickedAnimal);
        else load(clickedAnimal.id_public);
    };

    const capture = async () => {
        if (!chartRef.current) return null;
        const node = chartRef.current;
        // Explicit width/height override html2canvas's default (visible clientWidth), which would
        // otherwise crop the capture to whatever's scrolled into view on the overflowX:auto frame.
        return html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true, width: node.scrollWidth, height: node.scrollHeight, windowWidth: node.scrollWidth, windowHeight: node.scrollHeight });
    };

    const fileNameBase = subject?.name || subject?.litterInfo?.breedingPairCodeName || subject?.id_public || 'chart';

    const downloadImage = async () => {
        setIsSaving(true);
        try {
            const canvas = await capture();
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = `pedigree-${fileNameBase}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } finally { setIsSaving(false); }
    };

    const downloadPDF = async () => {
        setIsSaving(true);
        try {
            const canvas = await capture();
            if (!canvas) return;
            const pageW = 297;
            const pad = 4;
            const drawW = pageW - pad * 2;
            const ratio = drawW / canvas.width;
            const drawH = canvas.height * ratio;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, drawH + pad * 2] });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', pad, pad, drawW, drawH);
            pdf.save(`pedigree-${fileNameBase}.pdf`);
        } finally { setIsSaving(false); }
    };

    // CSS Grid layout, same fixed 16-row structure as the main site (keeps html2canvas happy
    // with row-spanning cells instead of using a real HTML table for the horizontal view).
    const renderHorizontal = () => {
        const genSlots = buildGenSlots(generations);
        const maxRows = 16;
        const rowMinH = 80;
        const rowGap = 3;
        const cells = [];
        for (let g = 0; g < generations; g++) {
            const slots = genSlots[g];
            const rowsPerSlot = maxRows / slots.length;
            slots.forEach((slot, i) => {
                const rowStart = i * rowsPerSlot + 1;
                const animal = getAncestor(subject, slot.path);
                const cellH = rowsPerSlot * rowMinH + (rowsPerSlot - 1) * rowGap;
                cells.push(
                    <div key={`${g}-${i}`} style={{ gridColumn: g + 1, gridRow: `${rowStart} / span ${rowsPerSlot}`, padding: 2, boxSizing: 'border-box', height: cellH }}>
                        <div style={{ height: cellH - 4 }}>
                            <Cell animal={animal} isSire={slot.isSire} onClick={handleCardClick} genIndex={g} />
                        </div>
                    </div>
                );
            });
        }
        // Give the earlier (more crowded) generations extra column width and let the
        // 4th generation - which only ever renders compact single-line text - stay narrow.
        const gridTemplateColumns = generations === 4
            ? Array.from({ length: generations }, (_, i) => (i === 3 ? '0.5fr' : '1.4fr')).join(' ')
            : `repeat(${generations}, 1fr)`;
        return (
            <div style={{ display: 'grid', gridTemplateColumns, gridTemplateRows: `repeat(${maxRows}, ${rowMinH}px)`, gap: 3, width: '100%', minWidth: 780 }}>
                {cells}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-800">Pedigree Certificate</h2>
                <div className="flex items-center gap-2">
                    <input type="range" min={1} max={4} value={generations} onChange={(e) => setGenerations(Number(e.target.value))} className="w-16 accent-accent" />
                    <span className="text-xs font-bold text-gray-500 w-3">{generations}</span>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><X size={18} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-3">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : (
                    <div
                        ref={chartRef}
                        style={{ backgroundColor: '#ffffff', border: `1.5px solid ${CERT_BORDER_COLOR}`, borderRadius: 8, padding: '6px 14px 10px 14px', boxSizing: 'border-box', fontFamily: 'Georgia, serif', overflowX: 'auto' }}
                    >
                        {/* Shares the grid's minWidth so the header/dividers/footer scroll in lockstep
                            with the wider generations and stay full-width instead of clipping to the viewport. */}
                        <div style={{ minWidth: 780 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, borderBottom: `1px solid ${CERT_BORDER_COLOR}`, paddingBottom: 4 }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: CERT_FONT_COLOR, lineHeight: 1.2 }}>{subject?.species || 'Unknown Species'}</div>
                                <div style={{ fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 600, color: CERT_FONT_COLOR }}>Certificate of Origin</div>
                            </div>

                            <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px dashed ${CERT_BORDER_COLOR}` }}>
                                <MainCard animal={subject} />
                            </div>

                            {renderHorizontal()}

                            <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${CERT_BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.6rem', color: '#9ca3af', fontStyle: 'italic' }}>This pedigree is not recognized by the state</div>
                                <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>{formatDate(new Date())}</div>
                                <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>Created by CritterTrack</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-2 p-3 bg-white border-t border-gray-200">
                <button onClick={downloadPDF} disabled={isSaving} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-gray-900 font-semibold py-2 rounded-lg text-sm disabled:opacity-60">
                    <Download size={15} /> {isSaving ? 'Saving…' : 'Save PDF'}
                </button>
                <button onClick={downloadImage} disabled={isSaving} className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 border border-gray-300 font-semibold py-2 rounded-lg text-sm disabled:opacity-60">
                    <ImageIcon size={15} /> {isSaving ? 'Saving…' : 'Save Image'}
                </button>
            </div>
        </div>
    );
};

export default PedigreeChart;
