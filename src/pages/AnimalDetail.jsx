import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Check, X, Mars, Venus, ScrollText, Heart, HeartOff, Eye, EyeOff } from 'lucide-react';
import TopBar from '../components/TopBar';
import AnimalImage from '../components/shared/AnimalImage';
import PedigreeChart from '../components/PedigreeChart';
import AssignCollectionsModal from '../components/AssignCollectionsModal';
import { API_BASE_URL } from '../utils/apiConfig';
import { formatDate, calculateAgeDetailed } from '../utils/dateFormatter';
import { getVariety } from '../utils/variety';
import { getReproState } from '../utils/reproState';
import { useSpeciesList } from '../hooks/useSpeciesList';
import { getSpeciesCategory, getAppearanceFields } from '../utils/appearanceFields';
import { useCollections } from '../hooks/useCollections';

const TABS = ['Summary', 'Records', 'Photos', 'Pedigree'];
const STATUS_OPTIONS = ['Pet', 'Growout', 'Breeder', 'Available', 'Booked', 'Retired', 'Deceased', 'Rehomed', 'Unknown'];
const GENDER_OPTIONS = ['Male', 'Female', 'Intersex', 'Mixed', 'Unknown'];
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'Negotiable'];
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$' };
const formatMoney = (amount, currency) => (currency === 'Negotiable' || !amount) ? (currency === 'Negotiable' ? 'Negotiable' : null) : `${CURRENCY_SYMBOLS[currency] || ''}${amount}`;
// Same stage badge styling as Breeding.jsx's LitterCard, for litter-tracked offspring groups.
const BADGE_STYLES = {
    Planned: 'bg-indigo-100 text-indigo-700',
    Mated: 'bg-sky-100 text-sky-700',
    Pregnant: 'bg-pink-100 text-pink-700',
};

const authHeaders = (authToken) => ({ headers: { Authorization: `Bearer ${authToken}` } });

const AnimalDetail = ({ authToken, userProfile }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [animal, setAnimal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('Summary');
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [parents, setParents] = useState({ sire: null, dam: null });
    const [offspringGroups, setOffspringGroups] = useState([]); // pedigree-only (not tracked by a Litter record)
    const [animalLitters, setAnimalLitters] = useState([]); // Litter Management records referencing this animal
    const [litterOffspringMap, setLitterOffspringMap] = useState({}); // litter_id_public -> offspring[]
    const [showCert, setShowCert] = useState(false);
    const [enclosureName, setEnclosureName] = useState(null);
    const [inbreeding, setInbreeding] = useState(null);
    const [showCollections, setShowCollections] = useState(false);
    const { collections, animalMap, createCollection, assignAnimal, unassignAnimal } = useCollections(authToken);
    const speciesList = useSpeciesList();

    const fetchAnimal = useCallback(async () => {
        setLoading(true);
        try {
            // /any/ falls back to public/minimal data for animals the viewer doesn't own,
            // so pedigree parent/offspring navigation works for non-owned animals too.
            const response = await axios.get(`${API_BASE_URL}/animals/any/${id}`, authHeaders(authToken));
            setAnimal(response.data);
            setForm(response.data);
        } catch (error) {
            console.error('Failed to fetch animal:', error);
        } finally {
            setLoading(false);
        }
    }, [id, authToken]);

    useEffect(() => { fetchAnimal(); }, [fetchAnimal]);

    // Parents are needed by both the Summary and Pedigree tabs, so fetch once the animal loads.
    useEffect(() => {
        if (!animal) return;
        const fetchOne = async (pid) => {
            if (!pid) return null;
            try {
                const res = await axios.get(`${API_BASE_URL}/animals/any/${pid}`, authHeaders(authToken));
                return res.data;
            } catch { return null; }
        };
        Promise.all([fetchOne(animal.sireId_public), fetchOne(animal.damId_public)])
            .then(([sire, dam]) => setParents({ sire, dam }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animal?.sireId_public, animal?.damId_public, authToken]);

    useEffect(() => {
        if (!animal || tab !== 'Pedigree') return;
        // Pedigree-based offspring not tracked by any Litter Management record.
        axios.get(`${API_BASE_URL}/animals/${id}/offspring`, authHeaders(authToken))
            .then((res) => setOffspringGroups(Array.isArray(res.data) ? res.data : []))
            .catch(() => setOffspringGroups([]));
        // Litter Management records referencing this animal (own, or others' if visible),
        // each with its own offspring list fetched separately by litter_id_public.
        axios.get(`${API_BASE_URL}/litters/for-animal/${id}`, authHeaders(authToken))
            .then((res) => {
                const litters = Array.isArray(res.data) ? res.data : [];
                setAnimalLitters(litters);
                litters.forEach((litter) => {
                    const lid = litter.litter_id_public;
                    if (!lid || !(litter.offspringIds_public || []).length) return;
                    axios.get(`${API_BASE_URL}/litters/${lid}/offspring`, authHeaders(authToken))
                        .then((r) => setLitterOffspringMap((prev) => ({ ...prev, [lid]: Array.isArray(r.data) ? r.data : [] })))
                        .catch(() => setLitterOffspringMap((prev) => ({ ...prev, [lid]: [] })));
                });
            })
            .catch(() => setAnimalLitters([]));
    }, [animal, tab, id, authToken]);

    useEffect(() => {
        if (!animal?.enclosureId) { setEnclosureName(null); return; }
        axios.get(`${API_BASE_URL}/enclosures/${animal.enclosureId}`, authHeaders(authToken))
            .then((res) => setEnclosureName(res.data?.name || null))
            .catch(() => setEnclosureName(null));
    }, [animal?.enclosureId, authToken]);

    useEffect(() => {
        if (!animal?.id_public) return;
        axios.get(`${API_BASE_URL}/animals/${animal.id_public}/inbreeding`, authHeaders(authToken))
            .then((res) => setInbreeding(res.data))
            .catch(() => setInbreeding(null));
    }, [animal?.id_public, authToken]);


    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const setChecked = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await axios.put(`${API_BASE_URL}/animals/${id}`, form, authHeaders(authToken));
            setAnimal(response.data);
            setForm(response.data);
            setEditing(false);
        } catch (error) {
            console.error('Failed to save animal:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleOwned = async () => {
        const newValue = !(animal.isOwned !== false);
        setAnimal((a) => ({ ...a, isOwned: newValue }));
        try {
            await axios.put(`${API_BASE_URL}/animals/${id}`, { isOwned: newValue }, authHeaders(authToken));
        } catch (error) {
            console.error('Failed to update owned status:', error);
            setAnimal((a) => ({ ...a, isOwned: !newValue })); // revert on failure
        }
    };

    const handleTogglePublic = async () => {
        const newValue = !animal.isDisplay;
        setAnimal((a) => ({ ...a, isDisplay: newValue }));
        try {
            await axios.put(`${API_BASE_URL}/animals/${id}`, { isDisplay: newValue }, authHeaders(authToken));
        } catch (error) {
            console.error('Failed to update public status:', error);
            setAnimal((a) => ({ ...a, isDisplay: !newValue })); // revert on failure
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-page-bg flex items-center justify-center">
                <Loader2 className="animate-spin text-accent" size={28} />
            </div>
        );
    }

    if (!animal) {
        return (
            <div className="min-h-screen bg-page-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
                <TopBar title="Animal" onBack={() => navigate(-1)} />
                <p className="text-center text-gray-400 text-sm py-16">Animal not found.</p>
            </div>
        );
    }

    const displayName = [animal.prefix, animal.name || 'Unnamed', animal.suffix].filter(Boolean).join(' ');
    const age = calculateAgeDetailed(animal.birthDate);
    const reproState = getReproState(animal);
    // _viewerHasAccess is true for BOTH real owners and view-only (transferred-away) users, so
    // it can't gate editing on its own — compare creatorId_public to the logged-in user instead.
    const canEdit = animal._viewerHasAccess === true && animal.creatorId_public === userProfile?.id_public;
    const identifiers = [
        ['Microchip', animal.microchipNumber],
        ['Breeder ID', animal.breederAssignedId],
        ['Registration', animal.pedigreeRegistrationId],
        ['Tattoo', animal.tattooId],
        ['Ring', animal.ringId],
        ['Eartag', animal.eartagNumber],
    ].filter(([, value]) => value);

    return (
        <div className="min-h-screen bg-page-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar
                title={displayName}
                onBack={() => navigate(-1)}
                right={
                    tab === 'Summary' && canEdit && (
                        editing ? (
                            <div className="flex gap-1">
                                <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-full bg-white/20"><Check size={16} /></button>
                                <button onClick={() => { setEditing(false); setForm(animal); }} className="p-1.5 rounded-full bg-white/20"><X size={16} /></button>
                            </div>
                        ) : (
                            <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 text-sm font-semibold">
                                <Pencil size={14} /> Edit
                            </button>
                        )
                    )
                }
            />

            <div className="mx-4 mt-4">
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-md bg-white">
                    <AnimalImage src={animal.imageUrl || animal.photoUrl} alt={displayName} iconSize={40} />
                </div>
            </div>

            <div className="mx-4 mt-3 mb-3 bg-white rounded-2xl shadow-sm p-4">
                <div className="text-center">
                    <p className="font-bold text-gray-800 flex items-center justify-center gap-1.5 flex-wrap">
                        {animal.gender === 'Male' && <Mars size={14} className="text-info-blue" />}
                        {animal.gender === 'Female' && <Venus size={14} className="text-accent" />}
                        {displayName}
                        {reproState && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${reproState.color}`}>
                                {reproState.label}
                            </span>
                        )}
                        {animal.isForSale && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                For Sale{formatMoney(animal.salePriceAmount, animal.salePriceCurrency) ? ` \u00b7 ${formatMoney(animal.salePriceAmount, animal.salePriceCurrency)}` : ''}
                            </span>
                        )}
                        {animal.availableForBreeding && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                Stud{formatMoney(animal.studFeeAmount, animal.studFeeCurrency) ? ` \u00b7 ${formatMoney(animal.studFeeAmount, animal.studFeeCurrency)}` : ''}
                            </span>
                        )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1 flex-wrap">
                        <span>{animal.species}</span>
                        {animal.status && <><span>•</span><span className="font-semibold text-accent">{animal.status}</span></>}
                        {animal.id_public && <><span>•</span><span>{animal.id_public}</span></>}
                    </p>
                    {canEdit && (
                        <div className="flex items-center justify-center gap-1.5 mt-2.5">
                            <button
                                onClick={handleToggleOwned}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border border-black ${
                                    animal.isOwned !== false ? 'bg-white text-accent' : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {animal.isOwned !== false ? <Heart size={12} /> : <HeartOff size={12} />}
                                {animal.isOwned !== false ? 'Owned' : 'Not Owned'}
                            </button>
                            <button
                                onClick={handleTogglePublic}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border border-black ${
                                    animal.isDisplay ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {animal.isDisplay ? <Eye size={12} /> : <EyeOff size={12} />}
                                {animal.isDisplay ? 'Public' : 'Private'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-center gap-1 px-4 mb-3">
                {TABS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                            tab === t ? 'bg-accent text-white' : 'bg-white text-gray-500'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="px-4 space-y-3">
                {tab === 'Summary' && (
                    editing ? (
                        <div className="bg-white rounded-xl p-4 space-y-3 shadow-sm">
                            <Field label="Name"><input value={form.name || ''} onChange={set('name')} className="input" /></Field>
                            <Field label="Prefix"><input value={form.prefix || ''} onChange={set('prefix')} className="input" /></Field>
                            <Field label="Suffix"><input value={form.suffix || ''} onChange={set('suffix')} className="input" /></Field>
                            <Field label="Gender">
                                <select value={form.gender || ''} onChange={set('gender')} className="input">
                                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </Field>
                            <Field label="Status">
                                <select value={form.status || ''} onChange={set('status')} className="input">
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                            <Field label="Birth Date">
                                <input type="date" value={form.birthDate ? form.birthDate.slice(0, 10) : ''} onChange={set('birthDate')} className="input" />
                            </Field>
                            <div className="border-t border-gray-100 pt-3">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Appearance</p>
                                <div className="space-y-3">
                                    {getAppearanceFields(getSpeciesCategory(speciesList, animal.species), animal.species).map(({ key, label }) => (
                                        <Field key={key} label={label}>
                                            <input value={form[key] || ''} onChange={set(key)} className="input" />
                                        </Field>
                                    ))}
                                </div>
                            </div>
                            <Field label="Remarks">
                                <textarea value={form.remarks || ''} onChange={set('remarks')} className="input" rows={3} />
                            </Field>
                            <div className="border-t border-gray-100 pt-3 space-y-2">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!form.isForSale} onChange={setChecked('isForSale')} className="w-4 h-4 accent-accent" />
                                    <span className="text-xs font-semibold text-gray-500">Available for Sale</span>
                                </label>
                                {form.isForSale && (
                                    <div className="flex gap-2 pl-6">
                                        <select value={form.salePriceCurrency || 'USD'} onChange={set('salePriceCurrency')} className="input w-24">
                                            {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input type="number" placeholder="Price" value={form.salePriceAmount ?? ''} onChange={set('salePriceAmount')} disabled={form.salePriceCurrency === 'Negotiable'} className="input flex-1" />
                                    </div>
                                )}
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!form.availableForBreeding} onChange={setChecked('availableForBreeding')} className="w-4 h-4 accent-accent" />
                                    <span className="text-xs font-semibold text-gray-500">Available for Stud/Breeding</span>
                                </label>
                                {form.availableForBreeding && (
                                    <div className="flex gap-2 pl-6">
                                        <select value={form.studFeeCurrency || 'USD'} onChange={set('studFeeCurrency')} className="input w-24">
                                            {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input type="number" placeholder="Fee" value={form.studFeeAmount ?? ''} onChange={set('studFeeAmount')} disabled={form.studFeeCurrency === 'Negotiable'} className="input flex-1" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-4 space-y-2 shadow-sm text-sm">
                            <p className="font-bold text-gray-800 mb-1">Summary</p>
                            <Row
                                label="Birth Date"
                                value={
                                    animal.birthDate && (
                                        <>
                                            {formatDate(animal.birthDate)}
                                            {age && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-pedigree-female-bg text-accent">{age}</span>}
                                        </>
                                    )
                                }
                            />
                            <Row label="Variety" value={getVariety(animal)} />
                            <Row label="Genetic Code" value={animal.geneticCode} />
                            <Row label="Father" value={parents.sire ? [parents.sire.prefix, parents.sire.name, parents.sire.suffix].filter(Boolean).join(' ') : null} />
                            <Row label="Mother" value={parents.dam ? [parents.dam.prefix, parents.dam.name, parents.dam.suffix].filter(Boolean).join(' ') : null} />
                            <Row label="Enclosure" value={enclosureName} />
                            <button onClick={() => setShowCollections(true)} className="w-full flex justify-between gap-3">
                                <span className="text-gray-400">Collection</span>
                                <span className="text-accent font-medium text-right underline">
                                    {(animalMap[animal.id_public] || []).map((cid) => collections.find((c) => c.id === cid)?.name).filter(Boolean).join(', ') || 'Add to collection'}
                                </span>
                            </button>
                            {identifiers.map(([label, value]) => <Row key={label} label={label} value={value} />)}
                            {inbreeding && (
                                <Row
                                    label="COI / AVK"
                                    value={`${(inbreeding.inbreedingCoefficient ?? 0).toFixed(2)}% / ${inbreeding.avgKinship != null ? inbreeding.avgKinship.toFixed(2) + '%' : '—'}`}
                                />
                            )}
                            {animal.remarks && <Row label="Remarks" value={animal.remarks} />}
                        </div>
                    )
                )}

                {tab === 'Records' && (
                    <div className="bg-white rounded-xl p-4 space-y-2 shadow-sm text-sm">
                        <Row label="Last Updated" value={formatDate(animal.updatedAt)} />
                        {animal.enclosureId && <Row label="Enclosure" value={enclosureName || animal.enclosureId} />}
                        {Array.isArray(animal.breedingRecords) && animal.breedingRecords.length > 0 ? (
                            <div className="pt-2">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Breeding Records</p>
                                {animal.breedingRecords.map((r, i) => (
                                    <p key={i} className="text-xs text-gray-600">{formatDate(r.date)} — {r.type || r.notes || 'Record'}</p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 pt-2">No scheduled or medical records yet.</p>
                        )}
                    </div>
                )}

                {tab === 'Photos' && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        {animal.imageUrl || animal.photoUrl ? (
                            <div className="w-full aspect-square rounded-lg overflow-hidden">
                                <AnimalImage src={animal.imageUrl || animal.photoUrl} alt={displayName} iconSize={40} />
                            </div>
                        ) : (
                            <p className="text-center text-xs text-gray-400 py-8">No photos yet.</p>
                        )}
                    </div>
                )}

                {tab === 'Pedigree' && (
                    <div className="space-y-3">
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setShowCert(true)}
                                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-gray-900 font-semibold shadow-sm"
                            >
                                <ScrollText size={16} /> Open Pedigree Certificate
                            </button>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Parents</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <ParentCard label="Sire" parent={parents.sire} onClick={() => parents.sire && navigate(`/animals/${parents.sire.id_public}`)} />
                                <ParentCard label="Dam" parent={parents.dam} onClick={() => parents.dam && navigate(`/animals/${parents.dam.id_public}`)} />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Offspring</p>
                            {animalLitters.length === 0 && offspringGroups.length === 0 ? (
                                <p className="text-xs text-gray-400">No offspring recorded.</p>
                            ) : (
                                <>
                                    {animalLitters.map((litter) => {
                                        const lid = litter.litter_id_public;
                                        const hasBirth = !!litter.birthDate;
                                        const hasPregnancy = !!litter.pregnancyDate;
                                        const isMated = !litter.isPlanned && !!litter.matingDate && !hasPregnancy && !hasBirth;
                                        const isPlannedOnly = litter.isPlanned && !hasPregnancy && !hasBirth;
                                        const isPregnant = hasPregnancy && !hasBirth;
                                        const stage = isPlannedOnly ? 'Planned' : isMated ? 'Mated' : isPregnant ? 'Pregnant' : null;
                                        const items = litterOffspringMap[lid];
                                        return (
                                            <div key={lid || litter._id} className="mb-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <p className="text-xs text-gray-500">{litter.breedingPairCodeName || lid || 'Untitled Litter'}</p>
                                                    {stage && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[stage]}`}>{stage}</span>}
                                                    {hasBirth && <span className="text-xs text-gray-400">{formatDate(litter.birthDate)}</span>}
                                                </div>
                                                {items === undefined ? (
                                                    <p className="text-xs text-gray-300">Loading…</p>
                                                ) : items.length === 0 ? (
                                                    <p className="text-xs text-gray-400">No offspring linked yet.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {items.map((o) => (
                                                            <button
                                                                key={o.id_public}
                                                                onClick={() => navigate(`/animals/${o.id_public}`)}
                                                                className="text-xs px-2 py-1 rounded-full bg-pedigree-female-bg text-accent font-medium"
                                                            >
                                                                {[o.prefix, o.name, o.suffix].filter(Boolean).join(' ') || 'Unnamed'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {offspringGroups.map((g, i) => (
                                        <div key={`ped-${i}`} className="mb-2">
                                            <p className="text-xs text-gray-500 mb-1">{formatDate(g.birthDate)}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {g.offspring.map((o) => (
                                                    <button
                                                        key={o.id_public}
                                                        onClick={() => navigate(`/animals/${o.id_public}`)}
                                                        className="text-xs px-2 py-1 rounded-full bg-pedigree-female-bg text-accent font-medium"
                                                    >
                                                        {[o.prefix, o.name, o.suffix].filter(Boolean).join(' ') || 'Unnamed'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showCert && (
                <PedigreeChart
                    animalId={id}
                    API_BASE_URL={API_BASE_URL}
                    authToken={authToken}
                    onClose={() => setShowCert(false)}
                    onViewAnimal={(a) => { setShowCert(false); navigate(`/animals/${a.id_public}`); }}
                />
            )}

            {showCollections && (
                <AssignCollectionsModal
                    animalId={animal.id_public}
                    collections={collections}
                    animalMap={animalMap}
                    onToggle={(aid, cid) => ((animalMap[aid] || []).includes(cid) ? unassignAnimal(aid, cid) : assignAnimal(aid, cid))}
                    onCreate={createCollection}
                    onClose={() => setShowCollections(false)}
                />
            )}
        </div>
    );
};

const Field = ({ label, children }) => (
    <label className="block">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <div className="mt-1">{children}</div>
    </label>
);

const Row = ({ label, value }) => (
    <div className="flex justify-between gap-3">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-800 font-medium text-right">{value || '—'}</span>
    </div>
);

const ParentCard = ({ label, parent, onClick }) => (
    <button onClick={onClick} disabled={!parent} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-left disabled:opacity-50">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {parent ? <AnimalImage src={parent.imageUrl || parent.photoUrl} alt={parent.name} iconSize={14} /> : null}
        </div>
        <div className="min-w-0">
            <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
            <p className="text-xs font-medium text-gray-700 truncate">
                {parent ? [parent.prefix, parent.name, parent.suffix].filter(Boolean).join(' ') : 'Unknown'}
            </p>
        </div>
    </button>
);

export default AnimalDetail;
