import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../utils/apiClient';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Check, X, Mars, Venus, ScrollText, Heart, HeartOff, Eye, EyeOff, Plus, Download, ChevronDown } from 'lucide-react';
import TopBar from '../components/TopBar';
import AnimalImage from '../components/shared/AnimalImage';
import PedigreeChart from '../components/PedigreeChart';
import AssignCollectionsModal from '../components/AssignCollectionsModal';
import ParentPickerModal from '../components/ParentPickerModal';
import ProfilePickerModal from '../components/ProfilePickerModal';
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
const HEALTH_STATUS_BADGE = {
    Healthy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    Monitoring: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    Concern: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    Critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$' };
const formatMoney = (amount, currency) => (currency === 'Negotiable' || !amount) ? (currency === 'Negotiable' ? 'Negotiable' : null) : `${CURRENCY_SYMBOLS[currency] || ''}${amount}`;
// Same stage badge styling as Breeding.jsx's LitterCard, for litter-tracked offspring groups.
const BADGE_STYLES = {
    Planned: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    Mated: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    Pregnant: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
};

const AnimalDetail = ({ authToken, userProfile }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [animal, setAnimal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('Summary');
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [openSections, setOpenSections] = useState({ main: true, appearance: false, ownership: false });
    const toggleSection = (key) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));
    const [openRecordSections, setOpenRecordSections] = useState({ breedingCare: true, healthcare: false, legalOther: false });
    const toggleRecordSection = (key) => setOpenRecordSections((s) => ({ ...s, [key]: !s[key] }));
    // Session-only — isPlannedMating/isInMating/isPregnant/isNursing are normally auto-synced
    // from Litter records (see reproStatusSync.js), so they must not be resent on unrelated
    // saves unless the user explicitly opts into overriding them for this save.
    const [reproOverride, setReproOverride] = useState(false);
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
            const response = await apiClient.get(`/animals/any/${id}`);
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
                const res = await apiClient.get(`/animals/any/${pid}`);
                return res.data;
            } catch { return null; }
        };
        Promise.all([fetchOne(animal.sireId_public), fetchOne(animal.damId_public)])
            .then(([sire, dam]) => setParents({ sire, dam }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animal?.sireId_public, animal?.damId_public, authToken]);

    // Resolve linked Breeder/Owner CTUIDs to a display name for the Ownership section.
    const [breederInfo, setBreederInfo] = useState(null);
    const [ownerInfo, setOwnerInfo] = useState(null);
    const [pickerTarget, setPickerTarget] = useState(null); // 'breeder' | 'owner' | null
    useEffect(() => {
        const resolve = async (ctuid) => {
            if (!ctuid) return null;
            try {
                const res = await apiClient.get('/public/profiles/search', { params: { query: ctuid, limit: 1 } });
                return Array.isArray(res.data) ? res.data[0] || null : null;
            } catch { return null; }
        };
        resolve(animal?.breederId_public).then(setBreederInfo);
        resolve(animal?.ownerId_public).then(setOwnerInfo);
    }, [animal?.breederId_public, animal?.ownerId_public]);

    const handleSelectProfile = (profile) => {
        const name = profile.breederName || profile.personalName || '';
        if (pickerTarget === 'breeder') {
            setForm((f) => ({ ...f, breederId_public: profile.id_public, manualBreederName: name }));
            setBreederInfo(profile);
        } else if (pickerTarget === 'owner') {
            setForm((f) => ({ ...f, ownerId_public: profile.id_public, manualownerName: name }));
            setOwnerInfo(profile);
        }
        setPickerTarget(null);
    };

    const clearProfileLink = (target) => {
        if (target === 'breeder') {
            setForm((f) => ({ ...f, breederId_public: null, manualBreederName: '' }));
            setBreederInfo(null);
        } else {
            setForm((f) => ({ ...f, ownerId_public: null, manualownerName: '' }));
            setOwnerInfo(null);
        }
    };

    useEffect(() => {
        if (!animal || tab !== 'Pedigree') return;
        // Pedigree-based offspring not tracked by any Litter Management record.
        apiClient.get(`/animals/${id}/offspring`)
            .then((res) => setOffspringGroups(Array.isArray(res.data) ? res.data : []))
            .catch(() => setOffspringGroups([]));
        // Litter Management records referencing this animal (own, or others' if visible),
        // each with its own offspring list fetched separately by litter_id_public.
        apiClient.get(`/litters/for-animal/${id}`)
            .then((res) => {
                const litters = Array.isArray(res.data) ? res.data : [];
                setAnimalLitters(litters);
                litters.forEach((litter) => {
                    const lid = litter.litter_id_public;
                    if (!lid || !(litter.offspringIds_public || []).length) return;
                    apiClient.get(`/litters/${lid}/offspring`)
                        .then((r) => setLitterOffspringMap((prev) => ({ ...prev, [lid]: Array.isArray(r.data) ? r.data : [] })))
                        .catch(() => setLitterOffspringMap((prev) => ({ ...prev, [lid]: [] })));
                });
            })
            .catch(() => setAnimalLitters([]));
    }, [animal, tab, id, authToken]);

    useEffect(() => {
        if (!animal?.enclosureId) { setEnclosureName(null); return; }
        apiClient.get(`/enclosures/${animal.enclosureId}`)
            .then((res) => setEnclosureName(res.data?.name || null))
            .catch(() => setEnclosureName(null));
    }, [animal?.enclosureId, authToken]);

    useEffect(() => {
        if (!animal?.id_public) return;
        apiClient.get(`/animals/${animal.id_public}/inbreeding`)
            .then((res) => setInbreeding(res.data))
            .catch(() => setInbreeding(null));
    }, [animal?.id_public, authToken]);


    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const setChecked = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { ...form };
            // Never resend these unless the user explicitly enabled the override this session —
            // they're normally auto-synced from Litter records and this form's load-time snapshot
            // can go stale (see reproStatusSync.js), silently clobbering the litter-synced truth.
            if (!reproOverride) {
                delete payload.isPlannedMating;
                delete payload.isInMating;
                delete payload.isPregnant;
                delete payload.isNursing;
            }
            const response = await apiClient.put(`/animals/${id}`, payload);
            // Merge rather than replace: when a write is queued offline, apiClient's synthetic
            // response only echoes back the sent payload, not a full server-computed document —
            // merging keeps every other field intact either way (a real server response's fields
            // simply win over the local `payload` spread, since it's spread last).
            setAnimal((a) => ({ ...a, ...payload, ...response.data }));
            setForm((f) => ({ ...f, ...payload, ...response.data }));
            setEditing(false);
            setReproOverride(false);
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
            await apiClient.put(`/animals/${id}`, { isOwned: newValue });
        } catch (error) {
            console.error('Failed to update owned status:', error);
            setAnimal((a) => ({ ...a, isOwned: !newValue })); // revert on failure
        }
    };

    const handleTogglePublic = async () => {
        const newValue = !animal.isDisplay;
        setAnimal((a) => ({ ...a, isDisplay: newValue }));
        try {
            await apiClient.put(`/animals/${id}`, { isDisplay: newValue });
        } catch (error) {
            console.error('Failed to update public status:', error);
            setAnimal((a) => ({ ...a, isDisplay: !newValue })); // revert on failure
        }
    };

    // 'sire' | 'dam' | null — which parent slot the picker modal is currently assigning.
    const [pickerRole, setPickerRole] = useState(null);
    const handleAssignParent = async (role, selectedAnimal) => {
        const key = role === 'sire' ? 'sireId_public' : 'damId_public';
        const fields = { [key]: selectedAnimal ? selectedAnimal.id_public : null };
        try {
            const response = await apiClient.put(`/animals/${id}`, fields);
            setAnimal((a) => ({ ...a, ...fields, ...response.data }));
            setForm((f) => ({ ...f, ...fields, ...response.data }));
            setParents((p) => ({ ...p, [role]: selectedAnimal || null }));
        } catch (error) {
            console.error(`Failed to update ${role}:`, error);
        } finally {
            setPickerRole(null);
        }
    };

    // Primary photo (imageUrl/photoUrl) and gallery (extraImages) are modeled as one combined
    // list here, with index 0 always the primary — mirrors crittertrack-frontend's gallery form.
    const photosFileInputRef = useRef(null);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const photos = animal ? [animal.imageUrl || animal.photoUrl, ...(Array.isArray(animal.extraImages) ? animal.extraImages : [])].filter(Boolean) : [];

    const persistPhotos = async (newPhotos) => {
        const [primary, ...rest] = newPhotos;
        const payload = { imageUrl: primary || null, photoUrl: primary || null, extraImages: rest };
        const response = await apiClient.put(`/animals/${id}`, payload);
        setAnimal((a) => ({ ...a, ...payload, ...response.data }));
        setForm((f) => ({ ...f, ...payload, ...response.data }));
    };

    const handleAddPhotos = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        setPhotoError('');
        setUploadingPhotos(true);
        try {
            const uploaded = await Promise.all(files.map(async (file) => {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('type', 'animal');
                const res = await apiClient.post('/upload', fd);
                return res.data?.url;
            }));
            await persistPhotos([...photos, ...uploaded.filter(Boolean)]);
        } catch (error) {
            console.error('Failed to upload photo:', error);
            setPhotoError('Failed to upload photo.');
        } finally {
            setUploadingPhotos(false);
        }
    };

    const handleRemovePhoto = async (index) => {
        setPhotoError('');
        try {
            await persistPhotos(photos.filter((_, i) => i !== index));
        } catch (error) {
            console.error('Failed to remove photo:', error);
            setPhotoError('Failed to remove photo.');
        }
    };

    // Data URIs (unlike blob: URIs) actually trigger Android WebView's download manager via a
    // plain <a download> click, same trick PedigreeChart.jsx's image/PDF export already relies on.
    const [enlargedImage, setEnlargedImage] = useState(null);
    const handleDownloadImage = async (url) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const link = document.createElement('a');
            link.download = `crittertrack-image-${Date.now()}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-page-bg dark:bg-dark-bg flex items-center justify-center">
                <Loader2 className="animate-spin text-accent" size={28} />
            </div>
        );
    }

    if (!animal) {
        return (
            <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
                <TopBar title="Animal" onBack={() => navigate(-1)} />
                <p className="text-center text-gray-400 dark:text-dark-text-muted text-sm py-16">Animal not found.</p>
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
    const hasRecordsData = Boolean(
        animal.lastFedDate || animal.feedingIntervalHours || (animal.animalCareTasks || []).length ||
        animal.isPregnant || animal.isNursing || animal.isInMating ||
        (animal.vetVisits || []).length || (animal.medications || []).length || (animal.vaccinations || []).length ||
        (animal.dewormingRecords || []).length || (animal.medicalConditions || []).length || (animal.allergies || []).length ||
        animal.healthStatusOverride || (animal.quarantineDetails?.status && animal.quarantineDetails.status !== 'None') ||
        animal.purchaseDate || animal.purchasePrice || animal.purchaseLocation || animal.sellerName ||
        animal.saleDate || animal.salePrice || animal.buyerName ||
        (animal.shows || []).length || (animal.milestones || []).length || (animal.breedingRecords || []).length
    );

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar
                title={displayName}
                onBack={() => navigate(-1)}
                right={
                    (tab === 'Summary' || tab === 'Records' || tab === 'Photos' || tab === 'Pedigree') && canEdit && (
                        editing ? (
                            <div className="flex gap-1">
                                <button onClick={() => (tab === 'Photos' || tab === 'Pedigree' ? setEditing(false) : handleSave())} disabled={saving} className="p-1.5 rounded-full bg-white/20"><Check size={16} /></button>
                                <button onClick={() => { setEditing(false); setForm(animal); setReproOverride(false); }} className="p-1.5 rounded-full bg-white/20"><X size={16} /></button>
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
                <button
                    type="button"
                    onClick={() => (animal.imageUrl || animal.photoUrl) && setEnlargedImage(animal.imageUrl || animal.photoUrl)}
                    className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-md bg-white dark:bg-dark-card-bg block"
                >
                    <AnimalImage src={animal.imageUrl || animal.photoUrl} alt={displayName} iconSize={40} />
                </button>
            </div>

            <div className="mx-4 mt-3 mb-3 bg-white dark:bg-dark-card-bg rounded-2xl shadow-sm p-4">
                <div className="text-center">
                    <p className="font-bold text-gray-800 dark:text-dark-text flex items-center justify-center gap-1.5 flex-wrap">
                        {animal.gender === 'Male' && <Mars size={14} className="text-info-blue" />}
                        {animal.gender === 'Female' && <Venus size={14} className="text-accent" />}
                        {displayName}
                        {reproState && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${reproState.color}`}>
                                {reproState.label}
                            </span>
                        )}
                        {animal.isForSale && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                For Sale{formatMoney(animal.salePriceAmount, animal.salePriceCurrency) ? ` \u00b7 ${formatMoney(animal.salePriceAmount, animal.salePriceCurrency)}` : ''}
                            </span>
                        )}
                        {animal.availableForBreeding && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                                Stud{formatMoney(animal.studFeeAmount, animal.studFeeCurrency) ? ` \u00b7 ${formatMoney(animal.studFeeAmount, animal.studFeeCurrency)}` : ''}
                            </span>
                        )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5 flex items-center justify-center gap-1 flex-wrap">
                        <span>{animal.species}</span>
                        {animal.status && <><span>•</span><span className="font-semibold text-accent">{animal.status}</span></>}
                        {animal.id_public && <><span>•</span><span>{animal.id_public}</span></>}
                    </p>
                    {canEdit && (
                        <div className="flex items-center justify-center gap-1.5 mt-2.5">
                            <button
                                onClick={handleToggleOwned}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border border-black ${
                                    animal.isOwned !== false ? 'bg-white dark:bg-dark-card-bg text-accent' : 'bg-gray-200 dark:bg-dark-surface-hover text-gray-600 dark:text-dark-text-secondary'
                                }`}
                            >
                                {animal.isOwned !== false ? <Heart size={12} /> : <HeartOff size={12} />}
                                {animal.isOwned !== false ? 'Owned' : 'Not Owned'}
                            </button>
                            <button
                                onClick={handleTogglePublic}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border border-black ${
                                    animal.isDisplay ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-dark-surface-hover text-gray-600 dark:text-dark-text-secondary'
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
                            tab === t ? 'bg-accent dark:bg-dark-accent text-white' : 'bg-white dark:bg-dark-card-bg text-gray-500 dark:text-dark-text-muted'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="px-4 space-y-3">
                {tab === 'Summary' && (
                    editing ? (
                        <div className="space-y-3">
                            <CollapsibleSection title="Main" open={openSections.main} onToggle={() => toggleSection('main')}>
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
                                <Field label="Remarks">
                                    <textarea value={form.remarks || ''} onChange={set('remarks')} className="input" rows={3} />
                                </Field>
                            </CollapsibleSection>

                            <CollapsibleSection title="Appearance" open={openSections.appearance} onToggle={() => toggleSection('appearance')}>
                                {getAppearanceFields(getSpeciesCategory(speciesList, animal.species), animal.species).map(({ key, label }) => (
                                    <Field key={key} label={label}>
                                        <input value={form[key] || ''} onChange={set(key)} className="input" />
                                    </Field>
                                ))}
                            </CollapsibleSection>

                            <CollapsibleSection title="Ownership" open={openSections.ownership} onToggle={() => toggleSection('ownership')}>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!form.isForSale} onChange={setChecked('isForSale')} className="w-4 h-4 accent-accent" />
                                    <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Available for Sale</span>
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
                                    <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Available for Stud/Breeding</span>
                                </label>
                                {form.availableForBreeding && (
                                    <div className="flex gap-2 pl-6">
                                        <select value={form.studFeeCurrency || 'USD'} onChange={set('studFeeCurrency')} className="input w-24">
                                            {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input type="number" placeholder="Fee" value={form.studFeeAmount ?? ''} onChange={set('studFeeAmount')} disabled={form.studFeeCurrency === 'Negotiable'} className="input flex-1" />
                                    </div>
                                )}
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3 space-y-3">
                                    <Field label="Breeder">
                                        <div className="flex gap-2">
                                            <input
                                                value={form.manualBreederName || ''}
                                                onChange={set('manualBreederName')}
                                                disabled={!!form.breederId_public}
                                                placeholder="Type a name..."
                                                className="input flex-1 disabled:bg-gray-100 dark:disabled:bg-dark-surface disabled:text-gray-500 dark:disabled:text-dark-text-muted"
                                            />
                                            {form.breederId_public ? (
                                                <button type="button" onClick={() => clearProfileLink('breeder')} className="px-2.5 rounded-lg bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted"><X size={14} /></button>
                                            ) : (
                                                <button type="button" onClick={() => setPickerTarget('breeder')} className="px-2.5 rounded-lg bg-gray-100 dark:bg-dark-surface text-accent text-xs font-semibold whitespace-nowrap">Link CTUID</button>
                                            )}
                                        </div>
                                        {form.breederId_public && <p className="text-[11px] text-gray-400 dark:text-dark-text-muted mt-1">Linked: {breederInfo?.breederName || breederInfo?.personalName || form.breederId_public}</p>}
                                    </Field>
                                    <Field label="Owner">
                                        <div className="flex gap-2">
                                            <input
                                                value={form.manualownerName || ''}
                                                onChange={set('manualownerName')}
                                                disabled={!!form.ownerId_public}
                                                placeholder="Type a name..."
                                                className="input flex-1 disabled:bg-gray-100 dark:disabled:bg-dark-surface disabled:text-gray-500 dark:disabled:text-dark-text-muted"
                                            />
                                            {form.ownerId_public ? (
                                                <button type="button" onClick={() => clearProfileLink('owner')} className="px-2.5 rounded-lg bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted"><X size={14} /></button>
                                            ) : (
                                                <button type="button" onClick={() => setPickerTarget('owner')} className="px-2.5 rounded-lg bg-gray-100 dark:bg-dark-surface text-accent text-xs font-semibold whitespace-nowrap">Link CTUID</button>
                                            )}
                                        </div>
                                        {form.ownerId_public && <p className="text-[11px] text-gray-400 dark:text-dark-text-muted mt-1">Linked: {ownerInfo?.breederName || ownerInfo?.personalName || form.ownerId_public}</p>}
                                    </Field>
                                    <Field label="Co-Owner"><input value={form.coOwnership || ''} onChange={set('coOwnership')} className="input" /></Field>
                                </div>
                            </CollapsibleSection>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-dark-card-bg rounded-xl p-4 space-y-2 shadow-sm text-sm">
                            <p className="font-bold text-gray-800 dark:text-dark-text mb-1">Summary</p>
                            <Row
                                label="Birth Date"
                                value={
                                    animal.birthDate && (
                                        <>
                                            {formatDate(animal.birthDate)}
                                            {age && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-pedigree-female-bg dark:bg-dark-accent/20 text-accent">{age}</span>}
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
                                <span className="text-gray-400 dark:text-dark-text-muted">Collection</span>
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
                            {(animal.manualBreederName || animal.breederId_public) && (
                                <Row label="Breeder" value={animal.manualBreederName || breederInfo?.breederName || breederInfo?.personalName || animal.breederId_public} />
                            )}
                            {(animal.manualownerName || animal.ownerId_public) && (
                                <Row label="Owner" value={animal.manualownerName || ownerInfo?.breederName || ownerInfo?.personalName || animal.ownerId_public} />
                            )}
                            {animal.coOwnership && <Row label="Co-Owner" value={animal.coOwnership} />}
                            {animal.remarks && <Row label="Remarks" value={animal.remarks} />}
                        </div>
                    )
                )}

                {tab === 'Records' && (
                    editing ? (
                        <div className="space-y-3">
                            <CollapsibleSection title="Breeding & Care" open={openRecordSections.breedingCare} onToggle={() => toggleRecordSection('breedingCare')}>
                                <Field label="Last Fed Date">
                                    <input type="date" value={form.lastFedDate ? form.lastFedDate.slice(0, 10) : ''} onChange={set('lastFedDate')} className="input" />
                                </Field>
                                <Field label="Feeding Interval (hours)">
                                    <input type="number" value={form.feedingIntervalHours ?? ''} onChange={set('feedingIntervalHours')} className="input" />
                                </Field>
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Care Tasks"
                                        records={form.animalCareTasks}
                                        onChange={(next) => setForm((f) => ({ ...f, animalCareTasks: next }))}
                                        defaults={{ taskName: '', lastDoneDate: null, frequencyDays: null, notes: '' }}
                                        fields={[
                                            { key: 'taskName', label: 'Task Name' },
                                            { key: 'lastDoneDate', label: 'Last Done', type: 'date' },
                                            { key: 'frequencyDays', label: 'Frequency (days)', type: 'number' },
                                            { key: 'notes', label: 'Notes' },
                                        ]}
                                    />
                                </div>
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3 space-y-2">
                                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">Reproduction State</p>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700/60 rounded-lg p-2.5 space-y-1">
                                        <p className="text-[11px] font-semibold text-gray-500 dark:text-dark-text-muted">Auto-calculated from Litters:</p>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">📋 Planned Mating: {animal.isPlannedMating ? '✓' : '✗'}</p>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">⚡ In Mating: {animal.isInMating ? '✓' : '✗'}</p>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">🤰 Pregnant: {animal.isPregnant ? '✓' : '✗'}</p>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">🍼 Nursing: {animal.isNursing ? '✓' : '✗'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (reproOverride) {
                                                setReproOverride(false);
                                                setForm((f) => ({ ...f, isPlannedMating: animal.isPlannedMating, isInMating: animal.isInMating, isPregnant: animal.isPregnant, isNursing: animal.isNursing }));
                                            } else {
                                                setReproOverride(true);
                                            }
                                        }}
                                        className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg ${reproOverride ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-dark-surface text-accent'}`}
                                    >
                                        {reproOverride ? 'Clear Override' : 'Enable Manual Override'}
                                    </button>
                                    {reproOverride && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-700/60 rounded-lg p-2.5 space-y-1.5">
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={!!form.isPlannedMating} onChange={setChecked('isPlannedMating')} className="w-4 h-4 accent-accent" />
                                                <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Planned Mating</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={!!form.isInMating} onChange={setChecked('isInMating')} className="w-4 h-4 accent-accent" />
                                                <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">In Mating</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={!!form.isPregnant} onChange={setChecked('isPregnant')} className="w-4 h-4 accent-accent" />
                                                <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Pregnant</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={!!form.isNursing} onChange={setChecked('isNursing')} className="w-4 h-4 accent-accent" />
                                                <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Nursing</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>

                            <CollapsibleSection title="Healthcare" open={openRecordSections.healthcare} onToggle={() => toggleRecordSection('healthcare')}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Health Status</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${HEALTH_STATUS_BADGE[form.healthStatusOverride || animal.healthStatus] || 'bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted'}`}>
                                        {form.healthStatusOverride || animal.healthStatus || 'Healthy'}
                                    </span>
                                </div>
                                <Field label="Override Health Status">
                                    <select value={form.healthStatusOverride || ''} onChange={(e) => setForm((f) => ({ ...f, healthStatusOverride: e.target.value || null }))} className="input">
                                        <option value="">None (auto-calculated)</option>
                                        <option value="Healthy">Healthy</option>
                                        <option value="Monitoring">Monitoring</option>
                                        <option value="Concern">Concern</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </Field>
                                {form.healthStatusOverride && (
                                    <Field label="Override Reason">
                                        <input value={form.healthStatusOverrideNotes || ''} onChange={set('healthStatusOverrideNotes')} className="input" />
                                    </Field>
                                )}

                                <div className="border-t border-gray-100 dark:border-dark-border pt-3 space-y-3">
                                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">Quarantine / Isolation</p>
                                    <Field label="Status">
                                        <select
                                            value={form.quarantineDetails?.status || 'None'}
                                            onChange={(e) => setForm((f) => ({ ...f, quarantineDetails: { ...f.quarantineDetails, status: e.target.value } }))}
                                            className="input"
                                        >
                                            <option value="None">None</option>
                                            <option value="Quarantine">Quarantine</option>
                                            <option value="Isolation">Isolation</option>
                                        </select>
                                    </Field>
                                    {(form.quarantineDetails?.status === 'Quarantine' || form.quarantineDetails?.status === 'Isolation') && (
                                        <>
                                            <Field label="Type/Reason">
                                                <select
                                                    value={form.quarantineDetails?.type || ''}
                                                    onChange={(e) => setForm((f) => ({ ...f, quarantineDetails: { ...f.quarantineDetails, type: e.target.value } }))}
                                                    className="input"
                                                >
                                                    <option value="">Select type...</option>
                                                    <option value="Preventive - New Arrival">Preventive - New Arrival</option>
                                                    <option value="Preventive - Intake">Preventive - Intake</option>
                                                    <option value="Medical - Illness/URI">Medical - Illness/URI</option>
                                                    <option value="Medical - Contagious Disease">Medical - Contagious Disease</option>
                                                    <option value="Medical - Recovery">Medical - Recovery</option>
                                                    <option value="Behavioral - Aggression">Behavioral - Aggression</option>
                                                    <option value="Behavioral - Fear/Stress">Behavioral - Fear/Stress</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </Field>
                                            <Field label="Additional Notes">
                                                <input
                                                    value={form.quarantineDetails?.reason || ''}
                                                    onChange={(e) => setForm((f) => ({ ...f, quarantineDetails: { ...f.quarantineDetails, reason: e.target.value } }))}
                                                    className="input"
                                                />
                                            </Field>
                                            <Field label="Start Date">
                                                <input
                                                    type="date"
                                                    value={form.quarantineDetails?.startDate ? form.quarantineDetails.startDate.slice(0, 10) : ''}
                                                    onChange={(e) => setForm((f) => ({ ...f, quarantineDetails: { ...f.quarantineDetails, startDate: e.target.value || null } }))}
                                                    className="input"
                                                />
                                            </Field>
                                            <Field label="End Date">
                                                <input
                                                    type="date"
                                                    value={form.quarantineDetails?.endDate ? form.quarantineDetails.endDate.slice(0, 10) : ''}
                                                    onChange={(e) => setForm((f) => ({ ...f, quarantineDetails: { ...f.quarantineDetails, endDate: e.target.value || null } }))}
                                                    className="input"
                                                />
                                            </Field>
                                        </>
                                    )}
                                </div>

                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Vet Visits"
                                        records={form.vetVisits}
                                        onChange={(next) => setForm((f) => ({ ...f, vetVisits: next }))}
                                        defaults={{ date: null, reason: '', notes: '' }}
                                        fields={[
                                            { key: 'date', label: 'Date', type: 'date' },
                                            { key: 'reason', label: 'Reason' },
                                            { key: 'notes', label: 'Notes' },
                                        ]}
                                    />
                                </div>
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Medications"
                                        records={form.medications}
                                        onChange={(next) => setForm((f) => ({ ...f, medications: next }))}
                                        defaults={{ name: '', dose: '', reason: '', startDate: null, stopDate: null, intervalValue: null, intervalUnit: 'hours', notes: '' }}
                                        fields={[
                                            { key: 'name', label: 'Name' },
                                            { key: 'dose', label: 'Dose' },
                                            { key: 'reason', label: 'Reason' },
                                            { key: 'startDate', label: 'Start Date', type: 'date' },
                                            { key: 'stopDate', label: 'Stop Date', type: 'date' },
                                            { key: 'intervalValue', label: 'Interval', type: 'number' },
                                            { key: 'intervalUnit', label: 'Interval Unit', type: 'select', options: ['hours', 'days', 'weeks'] },
                                            { key: 'notes', label: 'Notes' },
                                        ]}
                                    />
                                </div>
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Vaccinations"
                                        records={form.vaccinations}
                                        onChange={(next) => setForm((f) => ({ ...f, vaccinations: next }))}
                                        defaults={{ date: null, name: '', notes: '' }}
                                        fields={[
                                            { key: 'date', label: 'Date', type: 'date' },
                                            { key: 'name', label: 'Name' },
                                            { key: 'notes', label: 'Notes' },
                                        ]}
                                    />
                                </div>
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Deworming"
                                        records={form.dewormingRecords}
                                        onChange={(next) => setForm((f) => ({ ...f, dewormingRecords: next }))}
                                        defaults={{ date: null, medication: '', notes: '' }}
                                        fields={[
                                            { key: 'date', label: 'Date', type: 'date' },
                                            { key: 'medication', label: 'Medication' },
                                            { key: 'notes', label: 'Notes' },
                                        ]}
                                    />
                                </div>
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Medical Conditions"
                                        records={form.medicalConditions}
                                        onChange={(next) => setForm((f) => ({ ...f, medicalConditions: next }))}
                                        defaults={{ name: '', notes: '' }}
                                        fields={[
                                            { key: 'name', label: 'Condition' },
                                            { key: 'notes', label: 'Notes' },
                                        ]}
                                    />
                                </div>
                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Allergies"
                                        records={form.allergies}
                                        onChange={(next) => setForm((f) => ({ ...f, allergies: next }))}
                                        defaults={{ name: '', notes: '' }}
                                        fields={[
                                            { key: 'name', label: 'Allergy' },
                                            { key: 'notes', label: 'Notes' },
                                        ]}
                                    />
                                </div>
                            </CollapsibleSection>

                            <CollapsibleSection title="Legal & Other" open={openRecordSections.legalOther} onToggle={() => toggleRecordSection('legalOther')}>
                                <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">Purchase</p>
                                <Field label="Purchase Date">
                                    <input type="date" value={form.purchaseDate ? form.purchaseDate.slice(0, 10) : ''} onChange={set('purchaseDate')} className="input" />
                                </Field>
                                <Field label="Purchase Price">
                                    <div className="flex gap-2">
                                        <select value={form.purchasePriceCurrency || 'USD'} onChange={set('purchasePriceCurrency')} className="input w-24">
                                            {CURRENCY_OPTIONS.filter((c) => c !== 'Negotiable').map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input type="number" value={form.purchasePrice ?? ''} onChange={set('purchasePrice')} className="input flex-1" />
                                    </div>
                                </Field>
                                <Field label="Purchase Location">
                                    <input value={form.purchaseLocation || ''} onChange={set('purchaseLocation')} className="input" />
                                </Field>
                                <Field label="Seller Name">
                                    <input value={form.sellerName || ''} onChange={set('sellerName')} className="input" />
                                </Field>

                                <div className="border-t border-gray-100 dark:border-dark-border pt-3 space-y-3">
                                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">Sale</p>
                                    <Field label="Sale Date">
                                        <input type="date" value={form.saleDate ? form.saleDate.slice(0, 10) : ''} onChange={set('saleDate')} className="input" />
                                    </Field>
                                    <Field label="Sale Price">
                                        <div className="flex gap-2">
                                            <select value={form.saleRecordCurrency || 'USD'} onChange={set('saleRecordCurrency')} className="input w-24">
                                                {CURRENCY_OPTIONS.filter((c) => c !== 'Negotiable').map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <input type="number" value={form.salePrice ?? ''} onChange={set('salePrice')} className="input flex-1" />
                                        </div>
                                    </Field>
                                    <Field label="Buyer Name">
                                        <input value={form.buyerName || ''} onChange={set('buyerName')} className="input" />
                                    </Field>
                                </div>

                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Shows"
                                        records={form.shows}
                                        onChange={(next) => setForm((f) => ({ ...f, shows: next }))}
                                        defaults={{ date: null, showName: '', titleEarned: '', judgeName: '', score: '', judgeComments: '' }}
                                        fields={[
                                            { key: 'date', label: 'Date', type: 'date' },
                                            { key: 'showName', label: 'Show Name' },
                                            { key: 'titleEarned', label: 'Title Earned' },
                                            { key: 'judgeName', label: 'Judge' },
                                            { key: 'score', label: 'Score' },
                                            { key: 'judgeComments', label: 'Judge Comments' },
                                        ]}
                                    />
                                </div>

                                <div className="border-t border-gray-100 dark:border-dark-border pt-3">
                                    <RecordListEditor
                                        label="Milestones"
                                        records={form.milestones}
                                        onChange={(next) => setForm((f) => ({ ...f, milestones: next }))}
                                        defaults={{ label: '', startDate: null, interval: null, intervalUnit: 'week' }}
                                        fields={[
                                            { key: 'label', label: 'Label' },
                                            { key: 'startDate', label: 'Date', type: 'date' },
                                            { key: 'interval', label: 'Repeat Every', type: 'number' },
                                            { key: 'intervalUnit', label: 'Unit', type: 'select', options: ['day', 'week', 'month', 'year'] },
                                        ]}
                                    />
                                </div>
                            </CollapsibleSection>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-dark-card-bg rounded-xl p-4 space-y-2 shadow-sm text-sm">
                            <Row label="Last Updated" value={formatDate(animal.updatedAt)} />
                            {animal.enclosureId && <Row label="Enclosure" value={enclosureName || animal.enclosureId} />}
                            {animal.lastFedDate && <Row label="Last Fed" value={formatDate(animal.lastFedDate)} />}
                            {animal.feedingIntervalHours != null && <Row label="Feeding Interval" value={`${animal.feedingIntervalHours} hrs`} />}
                            {(animal.isPregnant || animal.isNursing || animal.isInMating) && (
                                <Row label="Reproduction State" value={[animal.isPregnant && 'Pregnant', animal.isNursing && 'Nursing', animal.isInMating && 'In Mating'].filter(Boolean).join(', ')} />
                            )}
                            <RecordListView label="Care Tasks" records={animal.animalCareTasks} renderItem={(r) => `${r.taskName}${r.frequencyDays ? ` every ${r.frequencyDays}d` : ''}${r.lastDoneDate ? ` (last: ${formatDate(r.lastDoneDate)})` : ''}`} />
                            <Row
                                label="Health Status"
                                value={
                                    (animal.healthStatusOverride || animal.healthStatus) && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${HEALTH_STATUS_BADGE[animal.healthStatusOverride || animal.healthStatus] || 'bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted'}`}>
                                            {animal.healthStatusOverride || animal.healthStatus}
                                        </span>
                                    )
                                }
                            />
                            {animal.quarantineDetails?.status && animal.quarantineDetails.status !== 'None' && (
                                <Row
                                    label="Quarantine"
                                    value={`${animal.quarantineDetails.status}${animal.quarantineDetails.type ? ` — ${animal.quarantineDetails.type}` : ''}${animal.quarantineDetails.startDate ? ` (since ${formatDate(animal.quarantineDetails.startDate)})` : ''}`}
                                />
                            )}
                            <RecordListView label="Vet Visits" records={animal.vetVisits} renderItem={(r) => `${formatDate(r.date)} — ${r.reason || 'Visit'}${r.notes ? `: ${r.notes}` : ''}`} />
                            <RecordListView label="Medications" records={animal.medications} renderItem={(r) => `${r.name}${r.dose ? ` (${r.dose})` : ''}${r.reason ? ` — ${r.reason}` : ''}`} />
                            <RecordListView label="Vaccinations" records={animal.vaccinations} renderItem={(r) => `${formatDate(r.date)} — ${r.name}`} />
                            <RecordListView label="Deworming" records={animal.dewormingRecords} renderItem={(r) => `${formatDate(r.date)} — ${r.medication}`} />
                            <RecordListView label="Medical Conditions" records={animal.medicalConditions} renderItem={(r) => `${r.name}${r.notes ? `: ${r.notes}` : ''}`} />
                            <RecordListView label="Allergies" records={animal.allergies} renderItem={(r) => `${r.name}${r.notes ? `: ${r.notes}` : ''}`} />
                            {(animal.purchaseDate || animal.purchasePrice != null || animal.purchaseLocation || animal.sellerName) && (
                                <div className="pt-2">
                                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">Purchase</p>
                                    {animal.purchaseDate && <Row label="Date" value={formatDate(animal.purchaseDate)} />}
                                    {animal.purchasePrice != null && <Row label="Price" value={`${animal.purchasePriceCurrency || 'USD'} ${animal.purchasePrice}`} />}
                                    {animal.purchaseLocation && <Row label="Location" value={animal.purchaseLocation} />}
                                    {animal.sellerName && <Row label="Seller" value={animal.sellerName} />}
                                </div>
                            )}
                            {(animal.saleDate || animal.salePrice != null || animal.buyerName) && (
                                <div className="pt-2">
                                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">Sale</p>
                                    {animal.saleDate && <Row label="Date" value={formatDate(animal.saleDate)} />}
                                    {animal.salePrice != null && <Row label="Price" value={`${animal.saleRecordCurrency || 'USD'} ${animal.salePrice}`} />}
                                    {animal.buyerName && <Row label="Buyer" value={animal.buyerName} />}
                                </div>
                            )}
                            <RecordListView label="Shows" records={animal.shows} renderItem={(r) => `${formatDate(r.date)} — ${r.showName}${r.titleEarned ? ` (${r.titleEarned})` : ''}`} />
                            <RecordListView label="Milestones" records={animal.milestones} renderItem={(r) => `${r.label} — ${formatDate(r.startDate)}${r.interval && r.intervalUnit ? ` (every ${r.interval} ${r.intervalUnit}${r.interval > 1 ? 's' : ''})` : ''}`} />
                            {Array.isArray(animal.breedingRecords) && animal.breedingRecords.length > 0 && (
                                <div className="pt-2">
                                    <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">Breeding Records</p>
                                    {animal.breedingRecords.map((r, i) => (
                                        <p key={i} className="text-xs text-gray-600 dark:text-dark-text-secondary">{formatDate(r.date)} — {r.type || r.notes || 'Record'}</p>
                                    ))}
                                </div>
                            )}
                            {!hasRecordsData && <p className="text-xs text-gray-400 dark:text-dark-text-muted pt-2">No scheduled or medical records yet.</p>}
                        </div>
                    )
                )}

                {tab === 'Photos' && (
                    <div className="bg-white dark:bg-dark-card-bg rounded-xl p-4 shadow-sm space-y-3">
                        {photoError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{photoError}</div>}
                        {photos.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 dark:text-dark-text-muted py-8">No photos yet.</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {photos.map((url, i) => (
                                    <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-surface">
                                        <button type="button" onClick={() => setEnlargedImage(url)} className="w-full h-full block">
                                            <AnimalImage src={url} alt={`${displayName} photo ${i + 1}`} iconSize={24} />
                                        </button>
                                        {i === 0 && (
                                            <span className="absolute top-1 left-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/60 text-white">Main</span>
                                        )}
                                        {canEdit && editing && (
                                            <button
                                                onClick={() => handleRemovePhoto(i)}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {canEdit && editing && (
                            <>
                                <input ref={photosFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
                                <button
                                    type="button"
                                    onClick={() => photosFileInputRef.current?.click()}
                                    disabled={uploadingPhotos}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-dark-border text-sm font-semibold text-accent disabled:opacity-60"
                                >
                                    {uploadingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {uploadingPhotos ? 'Uploading…' : 'Add Photo'}
                                </button>
                            </>
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
                        <div className="bg-white dark:bg-dark-card-bg rounded-xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-2">Parents</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="space-y-1">
                                    <ParentCard label="Sire" parent={parents.sire} onClick={() => parents.sire && navigate(`/animals/${parents.sire.id_public}`)} />
                                    {canEdit && editing && (
                                        <div className="flex gap-2 px-1">
                                            <button onClick={() => setPickerRole('sire')} className="text-[10px] font-semibold text-accent underline">
                                                {parents.sire ? 'Change' : 'Assign'}
                                            </button>
                                            {parents.sire && (
                                                <button onClick={() => handleAssignParent('sire', null)} className="text-[10px] font-semibold text-red-500 underline">Clear</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <ParentCard label="Dam" parent={parents.dam} onClick={() => parents.dam && navigate(`/animals/${parents.dam.id_public}`)} />
                                    {canEdit && editing && (
                                        <div className="flex gap-2 px-1">
                                            <button onClick={() => setPickerRole('dam')} className="text-[10px] font-semibold text-accent underline">
                                                {parents.dam ? 'Change' : 'Assign'}
                                            </button>
                                            {parents.dam && (
                                                <button onClick={() => handleAssignParent('dam', null)} className="text-[10px] font-semibold text-red-500 underline">Clear</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-dark-card-bg rounded-xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-2">Offspring</p>
                            {animalLitters.length === 0 && offspringGroups.length === 0 ? (
                                <p className="text-xs text-gray-400 dark:text-dark-text-muted">No offspring recorded.</p>
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
                                                    <p className="text-xs text-gray-500 dark:text-dark-text-muted">{litter.breedingPairCodeName || lid || 'Untitled Litter'}</p>
                                                    {stage && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_STYLES[stage]}`}>{stage}</span>}
                                                    {hasBirth && <span className="text-xs text-gray-400 dark:text-dark-text-muted">{formatDate(litter.birthDate)}</span>}
                                                </div>
                                                {items === undefined ? (
                                                    <p className="text-xs text-gray-300 dark:text-dark-text-muted">Loading…</p>
                                                ) : items.length === 0 ? (
                                                    <p className="text-xs text-gray-400 dark:text-dark-text-muted">No offspring linked yet.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {items.map((o) => (
                                                            <button
                                                                key={o.id_public}
                                                                onClick={() => navigate(`/animals/${o.id_public}`)}
                                                                className="text-xs px-2 py-1 rounded-full bg-pedigree-female-bg dark:bg-dark-accent/20 text-accent font-medium"
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
                                            <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">{formatDate(g.birthDate)}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {g.offspring.map((o) => (
                                                    <button
                                                        key={o.id_public}
                                                        onClick={() => navigate(`/animals/${o.id_public}`)}
                                                        className="text-xs px-2 py-1 rounded-full bg-pedigree-female-bg dark:bg-dark-accent/20 text-accent font-medium"
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

            {enlargedImage && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
                    onClick={() => setEnlargedImage(null)}
                >
                    <div className="relative max-w-full max-h-full flex flex-col items-center gap-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}
                            className="self-end text-white"
                        >
                            <X size={28} />
                        </button>
                        <img
                            src={enlargedImage}
                            alt="Enlarged view"
                            className="max-w-full max-h-[70vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadImage(enlargedImage); }}
                            className="bg-accent dark:bg-dark-accent text-white px-5 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm"
                        >
                            <Download size={18} /> Download Image
                        </button>
                    </div>
                </div>
            )}

            {pickerRole && (
                <ParentPickerModal
                    title={pickerRole === 'sire' ? 'Select Sire' : 'Select Dam'}
                    requiredGenders={pickerRole === 'sire' ? ['Male', 'Intersex', 'Unknown'] : ['Female', 'Intersex', 'Unknown']}
                    currentAnimalId={animal.id_public}
                    authToken={authToken}
                    onSelect={(a) => handleAssignParent(pickerRole, a)}
                    onClose={() => setPickerRole(null)}
                />
            )}

            {pickerTarget && (
                <ProfilePickerModal
                    title={pickerTarget === 'breeder' ? 'Link Breeder' : 'Link Owner'}
                    onSelect={handleSelectProfile}
                    onClose={() => setPickerTarget(null)}
                />
            )}
        </div>
    );
};

const Field = ({ label, children }) => (
    <label className="block">
        <span className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">{label}</span>
        <div className="mt-1">{children}</div>
    </label>
);

const CollapsibleSection = ({ title, open, onToggle, children }) => (
    <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-sm overflow-hidden">
        <button type="button" onClick={onToggle} className="w-full flex items-center justify-between p-4">
            <span className="text-sm font-bold text-gray-800 dark:text-dark-text">{title}</span>
            <ChevronDown size={16} className={`text-gray-400 dark:text-dark-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
);

// Read-only rendering of a record-array field, used by the non-editing Records view.
const RecordListView = ({ label, records, renderItem }) => {
    const list = Array.isArray(records) ? records : [];
    if (list.length === 0) return null;
    return (
        <div>
            <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase mb-1">{label}</p>
            <div className="space-y-1">
                {list.map((r, i) => <p key={r.id || i} className="text-xs text-gray-600 dark:text-dark-text-secondary">{renderItem(r)}</p>)}
            </div>
        </div>
    );
};

// Generic add/edit/delete list editor for the Animal's record-array fields (vetVisits, medications, etc).
const RecordListEditor = ({ label, records, fields, defaults, onChange }) => {
    const list = Array.isArray(records) ? records : [];
    const update = (idx, key, value) => onChange(list.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
    const remove = (idx) => onChange(list.filter((_, i) => i !== idx));
    const add = () => onChange([...list, { id: Date.now().toString(), ...defaults }]);

    return (
        <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase">{label}</p>
            {list.map((entry, idx) => (
                <div key={entry.id || idx} className="bg-gray-50 dark:bg-dark-surface rounded-lg p-3 space-y-2">
                    <div className="flex justify-end -mt-1 -mr-1">
                        <button type="button" onClick={() => remove(idx)} className="p-1 text-gray-400 dark:text-dark-text-muted"><X size={14} /></button>
                    </div>
                    {fields.map(({ key, label: fLabel, type, options }) => (
                        <Field key={key} label={fLabel}>
                            {type === 'select' ? (
                                <select value={entry[key] || ''} onChange={(e) => update(idx, key, e.target.value)} className="input">
                                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input
                                    type={type || 'text'}
                                    value={type === 'date' ? (entry[key] ? String(entry[key]).slice(0, 10) : '') : (entry[key] ?? '')}
                                    onChange={(e) => update(idx, key, e.target.value)}
                                    className="input"
                                />
                            )}
                        </Field>
                    ))}
                </div>
            ))}
            <button type="button" onClick={add} className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-accent border border-dashed border-accent/50 rounded-lg py-2">
                <Plus size={14} /> Add
            </button>
        </div>
    );
};

const Row = ({ label, value }) => (
    <div className="flex justify-between gap-3">
        <span className="text-gray-400 dark:text-dark-text-muted">{label}</span>
        <span className="text-gray-800 dark:text-dark-text font-medium text-right">{value || '—'}</span>
    </div>
);

const ParentCard = ({ label, parent, onClick }) => (
    <button onClick={onClick} disabled={!parent} className="flex items-center gap-2 bg-gray-50 dark:bg-dark-surface rounded-lg p-2 text-left disabled:opacity-50">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-surface-hover flex-shrink-0">
            {parent ? <AnimalImage src={parent.imageUrl || parent.photoUrl} alt={parent.name} iconSize={14} /> : null}
        </div>
        <div className="min-w-0">
            <p className="text-[10px] text-gray-400 dark:text-dark-text-muted uppercase font-bold">{label}</p>
            <p className="text-xs font-medium text-gray-700 dark:text-dark-text-secondary truncate">
                {parent ? [parent.prefix, parent.name, parent.suffix].filter(Boolean).join(' ') : 'Unknown'}
            </p>
        </div>
    </button>
);

export default AnimalDetail;
