import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2, Baby, Plus, Check, Calendar, ScanHeart, Hourglass, ChevronDown, X, Search, ScrollText } from 'lucide-react';
import TopBar from '../components/TopBar';
import AnimalImage from '../components/shared/AnimalImage';
import QuickAddAnimalModal from '../components/QuickAddAnimalModal';
import PedigreeChart from '../components/PedigreeChart';
import { API_BASE_URL } from '../utils/apiConfig';
import { formatDate, litterAge } from '../utils/dateFormatter';
import { getVariety } from '../utils/variety';

const authHeaders = (authToken) => ({ headers: { Authorization: `Bearer ${authToken}` } });

// Same stage rules as the main site's LitterManagement: Planned -> Mated -> Pregnant -> Born,
// with Weaned tracked separately once born (see handleMarkAs* in crittertrack-frontend).
const BADGE_STYLES = {
    Planned: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    Mated: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    Pregnant: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
    Born: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    Weaned: 'bg-gray-200 dark:bg-dark-surface-hover text-gray-700 dark:text-dark-text-secondary',
};
const STAGE_FILTERS = ['All', 'Planned', 'Mated', 'Pregnant', 'Born', 'Weaned'];

const getLitterStage = (litter) => {
    const hasBirth = !!litter.birthDate;
    const hasPregnancy = !!litter.pregnancyDate;
    if (hasBirth) return litter.weaningConfirmed ? 'Weaned' : 'Born';
    if (hasPregnancy) return 'Pregnant';
    if (!litter.isPlanned && litter.matingDate) return 'Mated';
    return 'Planned';
};

const animalFullName = (a) => a && [a.prefix, a.name, a.suffix].filter(Boolean).join(' ');

const ParentMini = ({ label, animal, navigate }) => (
    <button
        onClick={() => animal?.id_public && navigate(`/animals/${animal.id_public}`)}
        disabled={!animal}
        className="flex items-center gap-2 bg-gray-50 dark:bg-dark-surface rounded-lg p-1.5 text-left disabled:opacity-50"
    >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-surface-hover flex-shrink-0">
            {animal ? <AnimalImage src={animal.imageUrl || animal.photoUrl} alt={animal.name} iconSize={11} /> : null}
        </div>
        <div className="min-w-0">
            <p className="text-[9px] text-gray-400 dark:text-dark-text-muted uppercase font-bold">{label}</p>
            <p className="text-xs font-medium text-gray-700 dark:text-dark-text-secondary truncate">
                {animal ? [animal.prefix, animal.name, animal.suffix].filter(Boolean).join(' ') : 'Unknown'}
            </p>
        </div>
    </button>
);

const LitterCard = ({ litter, authToken, userProfile, onUpdated, onAddOffspring }) => {
    const navigate = useNavigate();
    const [savingBirthDate, setSavingBirthDate] = useState(false);
    const [birthDateInput, setBirthDateInput] = useState(litter.birthDate ? litter.birthDate.slice(0, 10) : '');
    const [showBirthInput, setShowBirthInput] = useState(false);
    const [busy, setBusy] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [offspring, setOffspring] = useState(null); // null = not loaded yet
    const [loadingOffspring, setLoadingOffspring] = useState(false);
    const [ownerNames, setOwnerNames] = useState({}); // creatorId_public -> display name, for transferred offspring
    const [showCert, setShowCert] = useState(false);

    // Same stage rules as crittertrack-frontend's LitterManagement: Planned -> Mated ->
    // Pregnant -> Born, with nursing/weaned tracked separately once born.
    const hasBirth = !!litter.birthDate;
    const hasPregnancy = !!litter.pregnancyDate;
    const isPregnant = hasPregnancy && !hasBirth;
    const isMated = !litter.isPlanned && !!litter.matingDate && !hasPregnancy && !hasBirth;
    const isPlannedOnly = litter.isPlanned && !hasPregnancy && !hasBirth;
    const isNursing = hasBirth && !litter.weaningConfirmed;
    const stageLabel = getLitterStage(litter);

    const offspringKey = (litter.offspringIds_public || []).join(',');
    useEffect(() => { setOffspring(null); }, [offspringKey]);
    useEffect(() => {
        if (!expanded || offspring !== null || !litter.litter_id_public) return;
        setLoadingOffspring(true);
        axios.get(`${API_BASE_URL}/litters/${litter.litter_id_public}/offspring`, authHeaders(authToken))
            .then((res) => setOffspring(Array.isArray(res.data) ? res.data : []))
            .catch(() => setOffspring([]))
            .finally(() => setLoadingOffspring(false));
    }, [expanded, offspring, litter.litter_id_public, authToken]);

    // Look up display names for any offspring that have been transferred away from this user.
    useEffect(() => {
        if (!offspring) return;
        const idsToFetch = [...new Set(
            offspring
                .filter((a) => a.creatorId_public && a.creatorId_public !== userProfile?.id_public && ownerNames[a.creatorId_public] === undefined)
                .map((a) => a.creatorId_public)
        )];
        if (idsToFetch.length === 0) return;
        idsToFetch.forEach((cid) => {
            setOwnerNames((prev) => ({ ...prev, [cid]: null })); // mark as loading
            axios.get(`${API_BASE_URL}/public/profile/${cid}`)
                .then((res) => setOwnerNames((prev) => ({ ...prev, [cid]: res.data?.breederName || res.data?.personalName || cid })))
                .catch(() => setOwnerNames((prev) => ({ ...prev, [cid]: cid })));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offspring, userProfile]);

    const markMated = async () => {
        setBusy(true);
        try {
            await axios.put(`${API_BASE_URL}/litters/${litter._id}`, { matingDate: new Date().toISOString(), isPlanned: false }, authHeaders(authToken));
            onUpdated();
        } finally { setBusy(false); }
    };

    const markPregnant = async () => {
        setBusy(true);
        try {
            await Promise.all([
                axios.put(`${API_BASE_URL}/litters/${litter._id}`, { pregnancyDate: new Date().toISOString() }, authHeaders(authToken)),
                litter.damId_public
                    ? axios.put(`${API_BASE_URL}/animals/${litter.damId_public}`, { isPregnant: true, isInMating: false }, authHeaders(authToken))
                    : Promise.resolve(),
            ]);
            onUpdated();
        } finally { setBusy(false); }
    };

    const markBorn = async (dateStr) => {
        setBusy(true);
        setSavingBirthDate(true);
        try {
            await Promise.all([
                axios.put(`${API_BASE_URL}/litters/${litter._id}`, { birthDate: dateStr }, authHeaders(authToken)),
                litter.damId_public
                    ? axios.put(`${API_BASE_URL}/animals/${litter.damId_public}`, { isPregnant: false, isNursing: true }, authHeaders(authToken))
                    : Promise.resolve(),
            ]);
            setShowBirthInput(false);
            onUpdated();
        } finally { setBusy(false); setSavingBirthDate(false); }
    };

    const markWeaned = async () => {
        setBusy(true);
        try {
            await Promise.all([
                axios.put(`${API_BASE_URL}/litters/${litter._id}`, { weaningDate: new Date().toISOString(), weaningConfirmed: true }, authHeaders(authToken)),
                litter.damId_public
                    ? axios.put(`${API_BASE_URL}/animals/${litter.damId_public}`, { isNursing: false }, authHeaders(authToken))
                    : Promise.resolve(),
            ]);
            onUpdated();
        } finally { setBusy(false); }
    };

    const totalBorn = litter.litterSizeBorn ?? litter.numberBorn ?? null;
    const offspringCount = (litter.offspringIds_public || []).length;
    const animalName = (a) => [a.prefix, a.name, a.suffix].filter(Boolean).join(' ') || a.id_public;

    return (
        <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-sm overflow-hidden">
            <div className="p-3.5 space-y-2.5 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800 dark:text-dark-text truncate min-w-0">{litter.breedingPairCodeName || litter.litter_id_public || 'Untitled Litter'}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {stageLabel && (
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${BADGE_STYLES[stageLabel]}`}>{stageLabel}</span>
                        )}
                        <ChevronDown size={16} className={`text-gray-300 dark:text-dark-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                    <ParentMini label="Sire" animal={litter.sire} navigate={navigate} />
                    <ParentMini label="Dam" animal={litter.dam} navigate={navigate} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 dark:bg-dark-surface rounded-lg py-2">
                    <div>
                        <p className="text-[10px] text-gray-400 dark:text-dark-text-muted uppercase font-semibold">Mated</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-dark-text-secondary">{litter.matingDate ? formatDate(litter.matingDate) : '—'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 dark:text-dark-text-muted uppercase font-semibold">Born</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-dark-text-secondary">{litter.birthDate ? formatDate(litter.birthDate) : '—'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 dark:text-dark-text-muted uppercase font-semibold">Age</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-dark-text-secondary">{litter.birthDate ? litterAge(litter.birthDate) : '—'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-dark-text-secondary">
                    <span>Born: <strong>{totalBorn ?? '—'}</strong></span>
                    {(litter.maleCount != null || litter.femaleCount != null) && (
                        <span><span className="text-info-blue font-semibold">{litter.maleCount ?? 0}M</span> / <span className="text-accent font-semibold">{litter.femaleCount ?? 0}F</span></span>
                    )}
                    <span>Offspring: <strong>{offspringCount}</strong></span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    {isPlannedOnly && (
                        <button onClick={markMated} disabled={busy} className="flex-1 flex items-center justify-center gap-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <Hourglass size={13} />} Mark as Mated
                        </button>
                    )}
                    {isMated && (
                        <button onClick={markPregnant} disabled={busy} className="flex-1 flex items-center justify-center gap-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <ScanHeart size={13} />} Assign Pregnant
                        </button>
                    )}
                    {isPregnant && !showBirthInput && (
                        <button onClick={() => markBorn(new Date().toISOString())} disabled={busy} className="flex-1 flex items-center justify-center gap-1 bg-primary/20 text-primary-dark text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />} Born Today
                        </button>
                    )}
                    {isPregnant && (
                        showBirthInput ? (
                            <div className="flex-1 flex items-center gap-1">
                                <input type="date" value={birthDateInput} onChange={(e) => setBirthDateInput(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-xs" />
                                <button onClick={() => birthDateInput && markBorn(birthDateInput)} disabled={savingBirthDate} className="p-1.5 bg-accent dark:bg-dark-accent text-white rounded-lg disabled:opacity-50">
                                    {savingBirthDate ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setShowBirthInput(true)} className="text-xs font-semibold text-gray-400 dark:text-dark-text-muted underline px-1">Backdate</button>
                        )
                    )}
                    {isNursing && (
                        <button onClick={markWeaned} disabled={busy} className="flex-1 flex items-center justify-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <Baby size={13} />} Wean Today
                        </button>
                    )}
                    {!litter.isPlanned && (
                        <button onClick={() => onAddOffspring(litter)} className="flex-1 flex items-center justify-center gap-1 bg-accent dark:bg-dark-accent text-white text-xs font-semibold py-1.5 rounded-lg">
                            <Plus size={13} /> Add Offspring
                        </button>
                    )}
                    {(litter.sire || litter.dam) && (
                        <button onClick={() => setShowCert(true)} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text-secondary border border-gray-300 dark:border-dark-border text-xs font-semibold py-1.5 rounded-lg">
                            <ScrollText size={13} /> Pedigree
                        </button>
                    )}
                </div>
            </div>

            {showCert && (
                <PedigreeChart
                    litterId={litter.litter_id_public}
                    currentUserIdPublic={userProfile?.id_public}
                    API_BASE_URL={API_BASE_URL}
                    authToken={authToken}
                    onClose={() => setShowCert(false)}
                    onViewAnimal={(a) => { setShowCert(false); navigate(`/animals/${a.id_public}`); }}
                />
            )}

            {expanded && (
                <div className="border-t border-gray-100 dark:border-dark-border px-3.5 py-2.5 bg-gray-50/60 dark:bg-dark-surface/60">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1.5">Offspring</p>
                    {loadingOffspring ? (
                        <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-accent" /></div>
                    ) : !offspring || offspring.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-dark-text-muted py-1">No offspring linked yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {offspring.map((a) => {
                                const isTransferred = !!a.creatorId_public && !!userProfile?.id_public && a.creatorId_public !== userProfile.id_public;
                                return (
                                    <button
                                        key={a.id_public}
                                        onClick={() => navigate(`/animals/${a.id_public}`)}
                                        className="w-full flex items-center gap-2.5 bg-white dark:bg-dark-card-bg rounded-lg p-2 shadow-sm text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-surface flex-shrink-0">
                                            <AnimalImage src={a.imageUrl || a.photoUrl} alt={a.name} iconSize={12} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-dark-text truncate">{animalName(a)}</p>
                                                {a.status && (
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-text-secondary whitespace-nowrap">{a.status}</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 dark:text-dark-text-muted truncate">{getVariety(a) || a.species}{a.gender ? ` • ${a.gender}` : ''}</p>
                                            {isTransferred && (
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate">Owner: {ownerNames[a.creatorId_public] || '…'}</p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {!litter.isPlanned && (
                        <button onClick={() => onAddOffspring(litter)} className="w-full mt-2 flex items-center justify-center gap-1 bg-accent dark:bg-dark-accent text-white text-xs font-semibold py-1.5 rounded-lg">
                            <Plus size={13} /> Add Offspring
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Plan a mating between two owned animals — mirrors crittertrack-frontend's handleSubmitMating
// payload shape. Litters normally start out isPlanned:true; if a Birth Date is supplied here
// (for logging something that already happened), the litter is created straight into the Born
// stage instead, matching how the main site's fuller "Create New Litter" form handles history.
const AddMatingModal = ({ authToken, onClose, onCreated }) => {
    const [animals, setAnimals] = useState([]);
    const [loadingAnimals, setLoadingAnimals] = useState(true);
    const [species, setSpecies] = useState('');
    const [sireId, setSireId] = useState('');
    const [damId, setDamId] = useState('');
    const [matingDate, setMatingDate] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`${API_BASE_URL}/animals`, authHeaders(authToken))
            .then((res) => setAnimals((Array.isArray(res.data) ? res.data : []).filter((a) => !a.isViewOnly)))
            .catch(() => setAnimals([]))
            .finally(() => setLoadingAnimals(false));
    }, [authToken]);

    const animalLabel = (a) => `${[a.prefix, a.name, a.suffix].filter(Boolean).join(' ')} (${a.species})`;
    const speciesOptions = [...new Set(animals.map((a) => a.species).filter(Boolean))].sort();
    const sires = animals.filter((a) => a.species === species && a.gender !== 'Female');
    const dams = animals.filter((a) => a.species === species && a.gender !== 'Male');

    const handleSpeciesChange = (val) => {
        setSpecies(val);
        setSireId('');
        setDamId('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!sireId || !damId) return;
        setSaving(true);
        setError('');
        try {
            const sire = animals.find((a) => a.id_public === sireId);
            const dam = animals.find((a) => a.id_public === damId);
            const alreadyBorn = !!birthDate;
            const payload = {
                sireId_public: sireId,
                damId_public: damId,
                species: species || sire?.species || dam?.species,
                matingDate: matingDate || (alreadyBorn ? birthDate : null),
                notes: notes || '',
                isPlanned: !alreadyBorn,
                numberBorn: 0,
            };
            if (alreadyBorn) {
                payload.pregnancyDate = matingDate || birthDate;
                payload.birthDate = birthDate;
            }
            const res = await axios.post(`${API_BASE_URL}/litters`, payload, authHeaders(authToken));
            if (alreadyBorn) {
                await axios.put(`${API_BASE_URL}/animals/${damId}`, { isPregnant: false, isNursing: true }, authHeaders(authToken));
            }
            onCreated(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create mating/litter.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-dark-card-bg w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-4 max-h-[85vh] overflow-y-auto space-y-3"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text">Plan a Mating</h2>
                    <button type="button" onClick={onClose}><X size={20} className="text-gray-400 dark:text-dark-text-muted" /></button>
                </div>

                {loadingAnimals ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-accent" size={22} /></div>
                ) : (
                    <>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Species</label>
                            <select value={species} onChange={(e) => handleSpeciesChange(e.target.value)} className="input mt-1" required>
                                <option value="">Select species...</option>
                                {speciesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <p className="text-[11px] text-gray-400 dark:text-dark-text-muted mt-1">Choose species first to filter the sire &amp; dam lists.</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Sire</label>
                            <select value={sireId} onChange={(e) => setSireId(e.target.value)} className="input mt-1" disabled={!species} required>
                                <option value="">Select sire...</option>
                                {sires.map((a) => <option key={a.id_public} value={a.id_public}>{animalLabel(a)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Dam</label>
                            <select value={damId} onChange={(e) => setDamId(e.target.value)} className="input mt-1" disabled={!species} required>
                                <option value="">Select dam...</option>
                                {dams.map((a) => <option key={a.id_public} value={a.id_public}>{animalLabel(a)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Expected/mating date (optional)</label>
                            <input type="date" value={matingDate} onChange={(e) => setMatingDate(e.target.value)} className="input mt-1" />
                            <p className="text-[11px] text-gray-400 dark:text-dark-text-muted mt-1">Just a record — even a past date won't change the litter's stage. Use "Mark as Mated" on the card for that, or fill in Birth Date below if it's already born.</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Birth date (optional — if already born)</label>
                            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input mt-1" />
                            <p className="text-[11px] text-gray-400 dark:text-dark-text-muted mt-1">Fill this in to log a litter that's already happened — it'll be created straight into the Born stage instead of Planned.</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Notes (optional)</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input mt-1" rows={2} />
                        </div>
                        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
                        <button type="submit" disabled={saving || !sireId || !damId} className="w-full flex items-center justify-center gap-1.5 bg-accent dark:bg-dark-accent text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Litter
                        </button>
                    </>
                )}
            </form>
        </div>
    );
};

const Breeding = ({ authToken, userProfile }) => {
    const navigate = useNavigate();
    const [litters, setLitters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addOffspringLitter, setAddOffspringLitter] = useState(null);
    const [showAddMating, setShowAddMating] = useState(false);
    const [stageFilter, setStageFilter] = useState('All');
    const [search, setSearch] = useState('');

    const fetchLitters = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/litters`, authHeaders(authToken));
            setLitters(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch litters:', error);
        } finally {
            setLoading(false);
        }
    }, [authToken]);

    useEffect(() => { fetchLitters(); }, [fetchLitters]);

    const filteredLitters = useMemo(() => {
        const q = search.trim().toLowerCase();
        return litters
            .filter((l) => stageFilter === 'All' || getLitterStage(l) === stageFilter)
            .filter((l) => {
                if (!q) return true;
                const haystack = [l.breedingPairCodeName, l.litter_id_public, animalFullName(l.sire), animalFullName(l.dam)]
                    .filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(q);
            });
    }, [litters, stageFilter, search]);

    const handleOffspringCreated = async (newAnimal) => {
        const litter = addOffspringLitter;
        setAddOffspringLitter(null);
        try {
            await axios.put(`${API_BASE_URL}/litters/${litter._id}`, {
                offspringIds_public: [...(litter.offspringIds_public || []), newAnimal.id_public],
            }, authHeaders(authToken));
        } catch (error) {
            console.error('Failed to link offspring to litter:', error);
        }
        fetchLitters();
        navigate(`/animals/${newAnimal.id_public}`);
    };

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar
                title="Litters"
                safeAreaTop={false}
                right={
                    <button onClick={() => setShowAddMating(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 text-sm font-semibold">
                        <Plus size={16} /> Add
                    </button>
                }
            />
            <div className="px-4 pt-3 space-y-2.5">
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by litter name, sire, or dam..."
                        className="w-full text-sm bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text rounded-lg pl-9 pr-3 py-2.5 shadow-sm outline-none"
                    />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {STAGE_FILTERS.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStageFilter(s)}
                            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition ${stageFilter === s ? 'bg-accent dark:bg-dark-accent text-white' : 'bg-white dark:bg-dark-card-bg text-gray-500 dark:text-dark-text-muted shadow-sm'}`}
                        >
                            {s} ({s === 'All' ? litters.length : litters.filter((l) => getLitterStage(l) === s).length})
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : litters.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-dark-text-muted text-sm flex flex-col items-center gap-2">
                        <Baby size={24} />
                        No litters recorded yet.
                    </div>
                ) : filteredLitters.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-dark-text-muted text-sm">No litters match your search/filter.</div>
                ) : (
                    filteredLitters.map((litter) => (
                        <LitterCard
                            key={litter._id}
                            litter={litter}
                            authToken={authToken}
                            userProfile={userProfile}
                            onUpdated={fetchLitters}
                            onAddOffspring={setAddOffspringLitter}
                        />
                    ))
                )}
            </div>

            {addOffspringLitter && (
                <QuickAddAnimalModal
                    authToken={authToken}
                    title="Add Offspring"
                    initialValues={{
                        birthDate: addOffspringLitter.birthDate ? addOffspringLitter.birthDate.slice(0, 10) : '',
                        species: addOffspringLitter.sire?.species || addOffspringLitter.dam?.species || undefined,
                    }}
                    extraFields={{
                        sireId_public: addOffspringLitter.sireId_public || undefined,
                        damId_public: addOffspringLitter.damId_public || undefined,
                        litterId: addOffspringLitter._id,
                    }}
                    onClose={() => setAddOffspringLitter(null)}
                    onCreated={handleOffspringCreated}
                />
            )}

            {showAddMating && (
                <AddMatingModal
                    authToken={authToken}
                    onClose={() => setShowAddMating(false)}
                    onCreated={() => { setShowAddMating(false); fetchLitters(); }}
                />
            )}
        </div>
    );
};

export default Breeding;
