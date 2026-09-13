import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, Home, Pencil, Check, X, Plus, ChevronDown, ChevronUp, Settings, Camera } from 'lucide-react';
import TopBar from '../components/TopBar';
import EnclosureDetailModal from '../components/EnclosureDetailModal';
import AnimalCard from '../components/AnimalCard';
import AnimalImage from '../components/shared/AnimalImage';

const PURPOSE_OPTIONS = [
    { value: '', label: 'General' },
    { value: 'reproduction', label: 'Breeding' },
    { value: 'health', label: 'Health/Quarantine' },
];

const formatDimensions = (dims) => {
    if (dims && (dims.length || dims.width || dims.height)) {
        return `${dims.length || '?'} x ${dims.width || '?'} x ${dims.height || '?'} ${dims.unit || 'in'}`;
    }
    return null;
};

const emptyEncForm = { name: '', enclosureType: '', purpose: '', capacity: '', length: '', width: '', height: '', unit: 'in' };

// Shared by both the create form and each row's edit form so uploaded files never leave the
// browser until the enclosure is actually saved.
const handleImagePick = (e, setFile, setPreview) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
};

const Enclosures = ({ authToken }) => {
    const navigate = useNavigate();
    const [enclosures, setEnclosures] = useState([]);
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(emptyEncForm);
    const [editImageFile, setEditImageFile] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const editFileInputRef = useRef(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEnc, setNewEnc] = useState(emptyEncForm);
    const [newImageFile, setNewImageFile] = useState(null);
    const [newImagePreview, setNewImagePreview] = useState(null);
    const newFileInputRef = useRef(null);
    const [creating, setCreating] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // allSettled (not all): while offline, one endpoint having no cached data yet
            // shouldn't blank out the other one that DOES have a valid cached response.
            const [enclosuresResult, animalsResult] = await Promise.allSettled([
                apiClient.get('/enclosures'),
                apiClient.get('/animals'),
            ]);
            if (enclosuresResult.status === 'fulfilled') {
                setEnclosures(Array.isArray(enclosuresResult.value.data) ? enclosuresResult.value.data : []);
            }
            if (animalsResult.status === 'fulfilled') {
                // isViewOnly = transferred-in animal the user doesn't actually own (archived is
                // already excluded server-side).
                setAnimals((Array.isArray(animalsResult.value.data) ? animalsResult.value.data : []).filter((a) => !a.isViewOnly));
            }
        } catch (error) {
            console.error('Failed to fetch enclosures:', error);
        } finally {
            setLoading(false);
        }
    }, [authToken]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const countsByEnclosure = useMemo(() => {
        const counts = {};
        animals.forEach((a) => { if (a.enclosureId) counts[a.enclosureId] = (counts[a.enclosureId] || 0) + 1; });
        return counts;
    }, [animals]);

    const startEdit = (enc) => {
        setEditingId(enc._id);
        setEditForm({
            name: enc.name || '',
            enclosureType: enc.enclosureType || '',
            purpose: enc.purpose === 'general' ? '' : (enc.purpose || ''),
            capacity: enc.capacity ?? '',
            length: enc.dimensions?.length ?? '',
            width: enc.dimensions?.width ?? '',
            height: enc.dimensions?.height ?? '',
            unit: enc.dimensions?.unit || 'in',
        });
        setEditImageFile(null);
        setEditImagePreview(null);
    };

    const saveEdit = async (enc) => {
        setSavingEdit(true);
        try {
            let imageUrl = enc.imageUrl || null;
            if (editImageFile) {
                const fd = new FormData();
                fd.append('file', editImageFile);
                fd.append('type', 'enclosure');
                const uploadRes = await apiClient.post('/upload', fd);
                if (uploadRes.data?.url) imageUrl = uploadRes.data.url;
            }
            // Spread the full existing enclosure first — the PUT route replaces every field it
            // knows about, and this form only exposes a subset, so fields set elsewhere (notes,
            // cleaning tasks, temperature/humidity, etc.) would otherwise get wiped out.
            const fields = {
                ...enc,
                name: editForm.name.trim(),
                enclosureType: editForm.enclosureType.trim(),
                purpose: editForm.purpose,
                capacity: editForm.capacity === '' ? null : Number(editForm.capacity),
                dimensions: {
                    length: editForm.length ? Number(editForm.length) : null,
                    width: editForm.width ? Number(editForm.width) : null,
                    height: editForm.height ? Number(editForm.height) : null,
                    unit: editForm.unit,
                },
                imageUrl,
            };
            await apiClient.put(`/enclosures/${enc._id}`, fields);
            // Patches local state directly instead of refetching — a refetch while offline
            // would just re-serve the stale pre-write cached list.
            setEnclosures((prev) => prev.map((e) => (e._id === enc._id ? { ...e, ...fields } : e)));
            setEditingId(null);
            setEditImageFile(null);
            setEditImagePreview(null);
        } catch (error) {
            console.error('Failed to update enclosure:', error);
        } finally {
            setSavingEdit(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newEnc.name.trim()) return;
        setCreating(true);
        try {
            let imageUrl = null;
            if (newImageFile) {
                const fd = new FormData();
                fd.append('file', newImageFile);
                fd.append('type', 'enclosure');
                const uploadRes = await apiClient.post('/upload', fd);
                imageUrl = uploadRes.data?.url || null;
            }
            await apiClient.post('/enclosures', {
                name: newEnc.name.trim(),
                enclosureType: newEnc.enclosureType.trim(),
                purpose: newEnc.purpose,
                capacity: newEnc.capacity === '' ? null : Number(newEnc.capacity),
                dimensions: {
                    length: newEnc.length ? Number(newEnc.length) : null,
                    width: newEnc.width ? Number(newEnc.width) : null,
                    height: newEnc.height ? Number(newEnc.height) : null,
                    unit: newEnc.unit,
                },
                imageUrl,
            });
            setNewEnc(emptyEncForm);
            setNewImageFile(null);
            setNewImagePreview(null);
            setShowAddForm(false);
            fetchAll();
        } catch (error) {
            console.error('Failed to create enclosure:', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar
                title="Enclosures"
                safeAreaTop={false}
                right={
                    <button onClick={() => setShowAddForm((s) => !s)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 text-sm font-semibold">
                        <Plus size={16} /> Add
                    </button>
                }
            />
            <div className="px-4 pt-3 space-y-2.5">
                {showAddForm && (
                    <form onSubmit={handleCreate} className="bg-white dark:bg-dark-card-bg rounded-xl p-3 shadow-sm space-y-2">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => newFileInputRef.current?.click()}
                                className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-surface flex items-center justify-center border border-gray-200 dark:border-dark-border"
                            >
                                {newImagePreview ? (
                                    <img src={newImagePreview} alt="Enclosure" className="w-full h-full object-cover" />
                                ) : (
                                    <Home size={20} className="text-gray-400 dark:text-dark-text-muted" />
                                )}
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                                    <Camera size={15} className="text-white" />
                                </div>
                            </button>
                            <input ref={newFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, setNewImageFile, setNewImagePreview)} />
                            <p className="text-xs text-gray-400 dark:text-dark-text-muted">Tap to add a photo</p>
                        </div>
                        <input
                            autoFocus
                            value={newEnc.name}
                            onChange={(e) => setNewEnc((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Name"
                            className="input"
                        />
                        <input
                            value={newEnc.enclosureType}
                            onChange={(e) => setNewEnc((f) => ({ ...f, enclosureType: e.target.value }))}
                            placeholder="Type (e.g. Tank, Cage, Vivarium)"
                            className="input"
                        />
                        <select value={newEnc.purpose} onChange={(e) => setNewEnc((f) => ({ ...f, purpose: e.target.value }))} className="input">
                            {PURPOSE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <input type="number" min="0" value={newEnc.capacity} onChange={(e) => setNewEnc((f) => ({ ...f, capacity: e.target.value }))} placeholder="Capacity (max animals)" className="input" />
                        <div className="flex items-center gap-1.5">
                            <input type="number" value={newEnc.length} onChange={(e) => setNewEnc((f) => ({ ...f, length: e.target.value }))} placeholder="L" className="input w-1/4" />
                            <input type="number" value={newEnc.width} onChange={(e) => setNewEnc((f) => ({ ...f, width: e.target.value }))} placeholder="W" className="input w-1/4" />
                            <input type="number" value={newEnc.height} onChange={(e) => setNewEnc((f) => ({ ...f, height: e.target.value }))} placeholder="H" className="input w-1/4" />
                            <select value={newEnc.unit} onChange={(e) => setNewEnc((f) => ({ ...f, unit: e.target.value }))} className="input w-1/4">
                                <option value="in">in</option>
                                <option value="cm">cm</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={creating || !newEnc.name.trim()} className="flex-1 flex items-center justify-center gap-1 bg-accent dark:bg-dark-accent text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create
                            </button>
                            <button type="button" onClick={() => { setShowAddForm(false); setNewEnc(emptyEncForm); setNewImageFile(null); setNewImagePreview(null); }} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-text-secondary text-xs font-semibold py-1.5 rounded-lg">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    </form>
                )}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : enclosures.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-dark-text-muted text-sm">No enclosures yet.</div>
                ) : (
                    enclosures.map((enc) => (
                        <div key={enc._id} className="bg-white dark:bg-dark-card-bg rounded-xl p-3 shadow-sm">
                            {editingId === enc._id ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => editFileInputRef.current?.click()}
                                            className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-surface flex items-center justify-center border border-gray-200 dark:border-dark-border"
                                        >
                                            {(editImagePreview || enc.imageUrl) ? (
                                                <img src={editImagePreview || enc.imageUrl} alt={enc.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Home size={20} className="text-gray-400 dark:text-dark-text-muted" />
                                            )}
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                                                <Camera size={15} className="text-white" />
                                            </div>
                                        </button>
                                        <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, setEditImageFile, setEditImagePreview)} />
                                        <p className="text-xs text-gray-400 dark:text-dark-text-muted">Tap to change photo</p>
                                    </div>
                                    <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Name" />
                                    <input value={editForm.enclosureType} onChange={(e) => setEditForm((f) => ({ ...f, enclosureType: e.target.value }))} className="input" placeholder="Type (e.g. Tank, Cage, Vivarium)" />
                                    <select value={editForm.purpose} onChange={(e) => setEditForm((f) => ({ ...f, purpose: e.target.value }))} className="input">
                                        {PURPOSE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                    <input type="number" min="0" value={editForm.capacity} onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))} className="input" placeholder="Capacity (max animals)" />
                                    <div className="flex items-center gap-1.5">
                                        <input type="number" value={editForm.length} onChange={(e) => setEditForm((f) => ({ ...f, length: e.target.value }))} placeholder="L" className="input w-1/4" />
                                        <input type="number" value={editForm.width} onChange={(e) => setEditForm((f) => ({ ...f, width: e.target.value }))} placeholder="W" className="input w-1/4" />
                                        <input type="number" value={editForm.height} onChange={(e) => setEditForm((f) => ({ ...f, height: e.target.value }))} placeholder="H" className="input w-1/4" />
                                        <select value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} className="input w-1/4">
                                            <option value="in">in</option>
                                            <option value="cm">cm</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => saveEdit(enc)} disabled={savingEdit} className="flex-1 flex items-center justify-center gap-1 bg-accent dark:bg-dark-accent text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                                            {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                                        </button>
                                        <button onClick={() => { setEditingId(null); setEditImageFile(null); setEditImagePreview(null); }} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-text-secondary text-xs font-semibold py-1.5 rounded-lg"><X size={14} /> Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-surface flex-shrink-0 flex items-center justify-center text-gray-400 dark:text-dark-text-muted">
                                        <AnimalImage src={enc.imageUrl} alt={enc.name} iconSize={20} FallbackIcon={Home} />
                                    </div>
                                    <button onClick={() => setExpandedId((id) => (id === enc._id ? null : enc._id))} className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{enc.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                                            {enc.enclosureType || 'Enclosure'} • {countsByEnclosure[enc._id] || 0}{enc.capacity ? `/${enc.capacity}` : ''} animals
                                        </p>
                                        {formatDimensions(enc.dimensions) && (
                                            <p className="text-xs text-gray-400 dark:text-dark-text-muted">{formatDimensions(enc.dimensions)}</p>
                                        )}
                                    </button>
                                    <button onClick={() => setSelected(enc)} className="p-1.5 text-gray-400 dark:text-dark-text-muted" title="Assign/remove animals"><Settings size={15} /></button>
                                    <button onClick={() => startEdit(enc)} className="p-1.5 text-gray-400 dark:text-dark-text-muted"><Pencil size={15} /></button>
                                    {expandedId === enc._id ? <ChevronUp size={16} className="text-gray-300 dark:text-dark-text-muted" /> : <ChevronDown size={16} className="text-gray-300 dark:text-dark-text-muted" />}
                                </div>
                            )}
                            {expandedId === enc._id && editingId !== enc._id && (
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-dark-border space-y-2">
                                    {(animals.filter((a) => a.enclosureId === enc._id)).length === 0 ? (
                                        <p className="text-xs text-gray-400 dark:text-dark-text-muted text-center py-2">No animals assigned yet.</p>
                                    ) : (
                                        animals.filter((a) => a.enclosureId === enc._id).map((a) => (
                                            <AnimalCard key={a.id_public} animal={a} onOpen={(id) => navigate(`/animals/${id}`)} />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {selected && (
                <EnclosureDetailModal
                    enclosure={selected}
                    authToken={authToken}
                    onClose={() => setSelected(null)}
                    onAnimalEnclosureChanged={(animalId, enclosureId) => {
                        setAnimals((prev) => prev.map((a) => (a.id_public === animalId ? { ...a, enclosureId } : a)));
                    }}
                />
            )}
        </div>
    );
};

export default Enclosures;
