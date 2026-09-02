import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Loader2, Home, Pencil, Check, X, Plus } from 'lucide-react';
import TopBar from '../components/TopBar';
import EnclosureDetailModal from '../components/EnclosureDetailModal';
import { API_BASE_URL } from '../utils/apiConfig';

const authHeaders = (authToken) => ({ headers: { Authorization: `Bearer ${authToken}` } });

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

const emptyNewEnc = { name: '', enclosureType: '', purpose: '', length: '', width: '', height: '', unit: 'in' };

const Enclosures = ({ authToken }) => {
    const [enclosures, setEnclosures] = useState([]);
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', capacity: '' });
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEnc, setNewEnc] = useState(emptyNewEnc);
    const [creating, setCreating] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [enclosuresRes, animalsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/enclosures`, authHeaders(authToken)),
                axios.get(`${API_BASE_URL}/animals`, authHeaders(authToken)),
            ]);
            setEnclosures(Array.isArray(enclosuresRes.data) ? enclosuresRes.data : []);
            // isViewOnly = transferred-in animal the user doesn't actually own (archived is
            // already excluded server-side).
            setAnimals((Array.isArray(animalsRes.data) ? animalsRes.data : []).filter((a) => !a.isViewOnly));
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
        setEditForm({ name: enc.name || '', capacity: enc.capacity ?? '' });
    };

    const saveEdit = async (enc) => {
        try {
            await axios.put(`${API_BASE_URL}/enclosures/${enc._id}`, {
                name: editForm.name,
                capacity: editForm.capacity === '' ? null : Number(editForm.capacity),
            }, authHeaders(authToken));
            setEditingId(null);
            fetchAll();
        } catch (error) {
            console.error('Failed to update enclosure:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newEnc.name.trim()) return;
        setCreating(true);
        try {
            await axios.post(`${API_BASE_URL}/enclosures`, {
                name: newEnc.name.trim(),
                enclosureType: newEnc.enclosureType.trim(),
                purpose: newEnc.purpose,
                dimensions: {
                    length: newEnc.length ? Number(newEnc.length) : null,
                    width: newEnc.width ? Number(newEnc.width) : null,
                    height: newEnc.height ? Number(newEnc.height) : null,
                    unit: newEnc.unit,
                },
            }, authHeaders(authToken));
            setNewEnc(emptyNewEnc);
            setShowAddForm(false);
            fetchAll();
        } catch (error) {
            console.error('Failed to create enclosure:', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
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
                    <form onSubmit={handleCreate} className="bg-white rounded-xl p-3 shadow-sm space-y-2">
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
                            <button type="submit" disabled={creating || !newEnc.name.trim()} className="flex-1 flex items-center justify-center gap-1 bg-accent text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create
                            </button>
                            <button type="button" onClick={() => { setShowAddForm(false); setNewEnc(emptyNewEnc); }} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold py-1.5 rounded-lg">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    </form>
                )}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : enclosures.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-sm">No enclosures yet.</div>
                ) : (
                    enclosures.map((enc) => (
                        <div key={enc._id} className="bg-white rounded-xl p-3 shadow-sm">
                            {editingId === enc._id ? (
                                <div className="space-y-2">
                                    <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Name" />
                                    <input type="number" value={editForm.capacity} onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))} className="input" placeholder="Capacity" />
                                    <div className="flex gap-2">
                                        <button onClick={() => saveEdit(enc)} className="flex-1 flex items-center justify-center gap-1 bg-accent text-white text-xs font-semibold py-1.5 rounded-lg"><Check size={14} /> Save</button>
                                        <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold py-1.5 rounded-lg"><X size={14} /> Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400">
                                        {enc.imageUrl ? <img src={enc.imageUrl} alt={enc.name} className="w-full h-full object-cover" /> : <Home size={20} />}
                                    </div>
                                    <button onClick={() => setSelected(enc)} className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{enc.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {enc.enclosureType || 'Enclosure'} • {countsByEnclosure[enc._id] || 0}{enc.capacity ? `/${enc.capacity}` : ''} animals
                                        </p>
                                        {formatDimensions(enc.dimensions) && (
                                            <p className="text-xs text-gray-400">{formatDimensions(enc.dimensions)}</p>
                                        )}
                                    </button>
                                    <button onClick={() => startEdit(enc)} className="p-1.5 text-gray-400"><Pencil size={15} /></button>
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
                    onChanged={fetchAll}
                />
            )}
        </div>
    );
};

export default Enclosures;
