import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../utils/apiClient';
import { X, Loader2, Plus, Trash2, Home } from 'lucide-react';
import AnimalImage from './shared/AnimalImage';

// Quick assign/remove animals for a single enclosure — opened from the Enclosures overview.
const EnclosureDetailModal = ({ enclosure, authToken, onClose, onChanged }) => {
    const [allAnimals, setAllAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPicker, setShowPicker] = useState(false);
    const [search, setSearch] = useState('');
    const [busyId, setBusyId] = useState(null);

    const fetchAnimals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/animals');
            // isViewOnly = transferred-in animal the user doesn't actually own (archived is
            // already excluded server-side).
            setAllAnimals((Array.isArray(res.data) ? res.data : []).filter((a) => !a.isViewOnly));
        } finally { setLoading(false); }
    }, [authToken]);

    useEffect(() => { fetchAnimals(); }, [fetchAnimals]);

    const assigned = useMemo(() => allAnimals.filter((a) => a.enclosureId === enclosure._id), [allAnimals, enclosure._id]);
    const unassigned = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allAnimals
            .filter((a) => a.enclosureId !== enclosure._id)
            .filter((a) => !q || [a.name, a.prefix, a.suffix, a.species].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
    }, [allAnimals, enclosure._id, search]);

    const assign = async (animal) => {
        setBusyId(animal.id_public);
        try {
            await apiClient.put(`/animals/${animal.id_public}`, { enclosureId: enclosure._id });
            await fetchAnimals();
            onChanged && onChanged();
        } finally { setBusyId(null); }
    };

    const remove = async (animal) => {
        setBusyId(animal.id_public);
        try {
            await apiClient.put(`/animals/${animal.id_public}`, { enclosureId: null });
            await fetchAnimals();
            onChanged && onChanged();
        } finally { setBusyId(null); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div
                className="bg-white dark:bg-dark-card-bg w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-4 max-h-[85vh] flex flex-col"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text truncate">{enclosure.name}</h2>
                    <button onClick={onClose}><X size={20} className="text-gray-400 dark:text-dark-text-muted" /></button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent" size={24} /></div>
                ) : showPicker ? (
                    <>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search animals to assign…"
                            className="input mb-2"
                        />
                        <div className="flex-1 overflow-y-auto space-y-1.5">
                            {unassigned.length === 0 && <p className="text-xs text-gray-400 dark:text-dark-text-muted text-center py-6">No matching animals.</p>}
                            {unassigned.map((a) => (
                                <button
                                    key={a.id_public}
                                    onClick={() => assign(a)}
                                    disabled={busyId === a.id_public}
                                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-dark-surface text-left disabled:opacity-50"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-surface-hover flex-shrink-0">
                                        <AnimalImage src={a.imageUrl || a.photoUrl} alt={a.name} iconSize={12} />
                                    </div>
                                    <span className="text-sm flex-1 truncate text-gray-800 dark:text-dark-text">{[a.prefix, a.name, a.suffix].filter(Boolean).join(' ')}</span>
                                    {busyId === a.id_public ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} className="text-accent" />}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowPicker(false)} className="mt-2 text-xs text-gray-500 dark:text-dark-text-muted font-semibold">Back to assigned list</button>
                    </>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto space-y-1.5">
                            {assigned.length === 0 && (
                                <div className="text-center py-8 text-gray-400 dark:text-dark-text-muted text-sm flex flex-col items-center gap-1.5">
                                    <Home size={22} />
                                    No animals assigned yet.
                                </div>
                            )}
                            {assigned.map((a) => (
                                <div key={a.id_public} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-dark-surface">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-surface-hover flex-shrink-0">
                                        <AnimalImage src={a.imageUrl || a.photoUrl} alt={a.name} iconSize={12} />
                                    </div>
                                    <span className="text-sm flex-1 truncate text-gray-800 dark:text-dark-text">{[a.prefix, a.name, a.suffix].filter(Boolean).join(' ')}</span>
                                    <button onClick={() => remove(a)} disabled={busyId === a.id_public} className="p-1 text-red-400 dark:text-red-400/80 disabled:opacity-50">
                                        {busyId === a.id_public ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowPicker(true)}
                            className="mt-2 flex items-center justify-center gap-1.5 bg-accent dark:bg-dark-accent text-white font-semibold py-2 rounded-lg text-sm"
                        >
                            <Plus size={16} /> Assign Animal
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default EnclosureDetailModal;
