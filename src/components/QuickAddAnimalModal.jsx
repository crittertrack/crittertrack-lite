import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { X, Loader2, ChevronLeft, Search, Plus, Camera, Cat } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';
import { getSpeciesCategory, getAppearanceFields } from '../utils/appearanceFields';

const GENDER_OPTIONS = ['Male', 'Female', 'Intersex', 'Mixed', 'Unknown'];
const STATUS_OPTIONS = ['Pet', 'Growout', 'Breeder', 'Available', 'Booked', 'Retired', 'Deceased', 'Rehomed', 'Unknown'];
const FALLBACK_CATEGORIES = ['Mammal', 'Reptile', 'Bird', 'Fish', 'Amphibian', 'Invertebrate', 'Other'];

// Multi-step flow: quick-pick an already-owned species -> or browse by category -> species,
// then fill in the animal's details. Skips straight to category picking if the user owns
// nothing yet, and skips species picking entirely if a species was already supplied (e.g.
// "Add Offspring" from a litter, via initialValues.species).
const QuickAddAnimalModal = ({ authToken, onClose, onCreated, initialValues = {}, extraFields = {}, title = 'Add Animal' }) => {
    const [allSpecies, setAllSpecies] = useState([]); // [{ name, category }]
    const [ownedSpecies, setOwnedSpecies] = useState([]); // string[]
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [step, setStep] = useState(initialValues.species ? 'details' : 'quickPick');
    const [backStack, setBackStack] = useState([]);
    const [category, setCategory] = useState(null);
    const [speciesSearch, setSpeciesSearch] = useState('');
    const [customSpecies, setCustomSpecies] = useState('');
    const [form, setForm] = useState({ prefix: '', name: '', suffix: '', species: '', gender: 'Unknown', birthDate: '', status: 'Pet', ...initialValues });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const handleImagePick = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    useEffect(() => {
        Promise.all([
            axios.get(`${API_BASE_URL}/species`).catch(() => ({ data: [] })),
            authToken
                ? axios.get(`${API_BASE_URL}/animals`, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => ({ data: [] }))
                : Promise.resolve({ data: [] }),
        ]).then(([speciesRes, animalsRes]) => {
            setAllSpecies(Array.isArray(speciesRes.data) ? speciesRes.data : []);
            const owned = Array.from(new Set((Array.isArray(animalsRes.data) ? animalsRes.data : []).map((a) => a.species).filter(Boolean))).sort();
            setOwnedSpecies(owned);
            if (owned.length === 0 && !initialValues.species) setStep('category');
        }).finally(() => setLoadingOptions(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken]);

    const categories = useMemo(() => {
        const set = new Set(FALLBACK_CATEGORIES);
        allSpecies.forEach((s) => set.add(s.category || 'Other'));
        return Array.from(set);
    }, [allSpecies]);

    const speciesInCategory = useMemo(() => {
        const list = category ? allSpecies.filter((s) => (s.category || 'Other') === category) : allSpecies;
        const q = speciesSearch.trim().toLowerCase();
        return (q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list).slice().sort((a, b) => a.name.localeCompare(b.name));
    }, [allSpecies, category, speciesSearch]);

    const appearanceFields = useMemo(
        () => getAppearanceFields(getSpeciesCategory(allSpecies, form.species), form.species),
        [allSpecies, form.species]
    );

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const goto = (next) => { setBackStack((s) => [...s, step]); setStep(next); };
    const goBack = () => {
        if (backStack.length === 0) return;
        const prev = backStack[backStack.length - 1];
        setBackStack(backStack.slice(0, -1));
        setStep(prev);
    };

    const chooseSpecies = (name) => { setForm((f) => ({ ...f, species: name })); goto('details'); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = { ...form, ...extraFields, isOwned: true };
            if (imageFile) {
                const fd = new FormData();
                fd.append('file', imageFile);
                fd.append('type', 'animal');
                const uploadRes = await axios.post(`${API_BASE_URL}/upload`, fd, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });
                const url = uploadRes.data?.url;
                if (url) { payload.imageUrl = url; payload.photoUrl = url; }
            }
            const response = await axios.post(`${API_BASE_URL}/animals`, payload, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            onCreated(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add animal.');
        } finally {
            setSaving(false);
        }
    };

    const headerTitle = step === 'category' ? 'Select Category' : step === 'species' ? (category || 'Select Species') : title;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-card-bg w-full max-w-sm rounded-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-dark-border flex-shrink-0">
                    {backStack.length > 0 && (
                        <button type="button" onClick={goBack} className="p-1 -ml-1 text-gray-400 dark:text-dark-text-muted"><ChevronLeft size={20} /></button>
                    )}
                    <h2 className="text-base font-bold text-gray-800 dark:text-dark-text flex-1 truncate">{headerTitle}</h2>
                    <button type="button" onClick={onClose} className="p-1 text-gray-400 dark:text-dark-text-muted"><X size={20} /></button>
                </div>

                <div className="overflow-y-auto px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                    {(step !== 'details' && loadingOptions) ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent" size={24} /></div>
                    ) : step === 'quickPick' ? (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-400 dark:text-dark-text-muted uppercase tracking-wide">Quick Add</p>
                            <div className="grid grid-cols-2 gap-2">
                                {ownedSpecies.map((s) => (
                                    <button key={s} type="button" onClick={() => chooseSpecies(s)} className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface text-sm font-semibold text-gray-700 dark:text-dark-text-secondary text-left">
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={() => goto('category')} className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-dark-border text-sm font-semibold text-accent">
                                <Plus size={15} /> New Species
                            </button>
                        </div>
                    ) : step === 'category' ? (
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map((c) => (
                                <button key={c} type="button" onClick={() => { setCategory(c); goto('species'); }} className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-dark-surface text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                                    {c}
                                </button>
                            ))}
                        </div>
                    ) : step === 'species' ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted" />
                                <input value={speciesSearch} onChange={(e) => setSpeciesSearch(e.target.value)} placeholder="Search species..." className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm" />
                            </div>
                            <div className="space-y-1 max-h-56 overflow-y-auto">
                                {speciesInCategory.length === 0 ? (
                                    <p className="text-xs text-gray-400 dark:text-dark-text-muted text-center py-4">No species found.</p>
                                ) : speciesInCategory.map((s) => (
                                    <button key={s.name} type="button" onClick={() => chooseSpecies(s.name)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface text-sm text-gray-700 dark:text-dark-text-secondary">
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                            <form
                                onSubmit={(e) => { e.preventDefault(); if (customSpecies.trim()) chooseSpecies(customSpecies.trim()); }}
                                className="flex gap-2 pt-2 border-t border-gray-100 dark:border-dark-border mt-2"
                            >
                                <input value={customSpecies} onChange={(e) => setCustomSpecies(e.target.value)} placeholder="Or type a custom species..." className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm" />
                                <button type="submit" className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-text-secondary text-sm font-semibold">Use</button>
                            </form>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-3">
                            {error && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/60 rounded-lg px-3 py-2">{error}</div>}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-surface flex items-center justify-center border border-gray-200 dark:border-dark-border"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Animal" className="w-full h-full object-cover" />
                                    ) : (
                                        <Cat size={24} className="text-gray-400 dark:text-dark-text-muted" />
                                    )}
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                                        <Camera size={16} className="text-white" />
                                    </div>
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                                <button
                                    type="button"
                                    onClick={() => goto(ownedSpecies.length ? 'quickPick' : 'category')}
                                    className="text-xs font-semibold text-accent underline"
                                >
                                    {form.species || 'Choose species'} · Change
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Prefix</label>
                                    <input value={form.prefix} onChange={set('prefix')} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Name</label>
                                    <input required value={form.name} onChange={set('name')} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm" placeholder="Name" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Suffix</label>
                                    <input value={form.suffix} onChange={set('suffix')} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Gender</label>
                                    <select value={form.gender} onChange={set('gender')} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm">
                                        {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Status</label>
                                    <select value={form.status} onChange={set('status')} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm">
                                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">Birth Date</label>
                                <input type="date" value={form.birthDate} onChange={set('birthDate')} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-dark-border">
                                {appearanceFields.map(({ key, label }) => (
                                    <div key={key}>
                                        <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted">{label}</label>
                                        <input value={form[key] || ''} onChange={set(key)} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm" />
                                    </div>
                                ))}
                            </div>
                            <button type="submit" disabled={saving || !form.species} className="w-full flex items-center justify-center gap-2 bg-accent dark:bg-dark-accent text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
                                {saving && <Loader2 size={16} className="animate-spin" />}
                                {saving ? 'Adding…' : 'Add Animal'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickAddAnimalModal;
