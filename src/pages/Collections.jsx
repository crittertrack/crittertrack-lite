import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import TopBar from '../components/TopBar';
import AnimalImage from '../components/shared/AnimalImage';
import { API_BASE_URL } from '../utils/apiConfig';
import { useCollections } from '../hooks/useCollections';

const Collections = ({ authToken }) => {
    const navigate = useNavigate();
    const [animals, setAnimals] = useState([]);
    const [loadingAnimals, setLoadingAnimals] = useState(true);
    const [ownedMode, setOwnedMode] = useState('owned'); // 'owned' | 'all'
    const { collections, animalMap, loading: loadingCollections, createCollection, renameCollection, deleteCollection } = useCollections(authToken);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const fetchAnimals = useCallback(async () => {
        if (!authToken) return;
        setLoadingAnimals(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/animals`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            // isViewOnly = transferred-in animal the user doesn't actually own (archived is
            // already excluded server-side).
            setAnimals((Array.isArray(response.data) ? response.data : []).filter((a) => !a.isViewOnly));
        } catch (error) {
            console.error('Failed to fetch animals:', error);
        } finally {
            setLoadingAnimals(false);
        }
    }, [authToken]);

    useEffect(() => { fetchAnimals(); }, [fetchAnimals]);

    const animalById = useMemo(() => {
        const map = {};
        (ownedMode === 'owned' ? animals.filter((a) => a.isOwned !== false) : animals).forEach((a) => { map[a.id_public] = a; });
        return map;
    }, [animals, ownedMode]);

    const groups = useMemo(() => collections.map((c) => ({
        ...c,
        matches: Object.entries(animalMap)
            .filter(([, ids]) => Array.isArray(ids) && ids.includes(c.id))
            .map(([animalId]) => animalById[animalId])
            .filter(Boolean),
    })), [collections, animalMap, animalById]);

    const loading = loadingAnimals || loadingCollections;

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        createCollection(newName);
        setNewName('');
    };

    const startEdit = (c) => { setEditingId(c.id); setEditName(c.name); };
    const commitEdit = (e) => {
        e.preventDefault();
        renameCollection(editingId, editName);
        setEditingId(null);
    };
    const handleDelete = (c) => {
        if (window.confirm(`Delete "${c.name}"? This won't delete any animals, just the collection.`)) {
            deleteCollection(c.id);
        }
    };

    return (
        <div className="min-h-screen bg-page-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar
                title="Collections"
                safeAreaTop={false}
                right={
                    <div className="flex bg-white/20 rounded-full p-0.5 text-xs font-semibold">
                        {['owned', 'all'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setOwnedMode(mode)}
                                className={`px-3 py-1 rounded-full capitalize transition ${ownedMode === mode ? 'bg-white text-accent' : 'text-white'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                }
            />
            <div className="px-4 pt-3 space-y-2.5">
                <form onSubmit={handleCreate} className="flex items-center gap-2">
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="New collection name..."
                        className="flex-1 text-sm bg-white rounded-lg px-3 py-2.5 shadow-sm outline-none"
                    />
                    <button type="submit" className="p-2.5 rounded-lg bg-accent text-white flex-shrink-0"><Plus size={18} /></button>
                </form>

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : groups.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-16">No collections yet. Create one above to start organizing your animals.</p>
                ) : (
                    groups.map((g) => (
                        editingId === g.id ? (
                            <form key={g.id} onSubmit={commitEdit} className="flex items-center gap-2 bg-white rounded-xl p-3 shadow-sm">
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 outline-none"
                                />
                                <button type="submit" className="p-1.5 rounded-full bg-green-100 text-green-700"><Check size={16} /></button>
                                <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
                            </form>
                        ) : (
                            <div key={g.id} className="w-full flex items-center gap-2 bg-white rounded-xl p-3 shadow-sm">
                                <button
                                    onClick={() => navigate(`/animals?collection=${g.id}`)}
                                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                                >
                                    <div className="flex -space-x-3 flex-shrink-0">
                                        {g.matches.slice(0, 3).map((a) => (
                                            <div key={a.id_public} className="w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-gray-100">
                                                <AnimalImage src={a.imageUrl || a.photoUrl} alt={a.name} iconSize={14} />
                                            </div>
                                        ))}
                                        {g.matches.length === 0 && <div className="w-9 h-9 rounded-full bg-gray-100" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{g.name}</p>
                                        <p className="text-xs text-gray-500">{g.matches.length} animal{g.matches.length === 1 ? '' : 's'}</p>
                                    </div>
                                </button>
                                <button onClick={() => startEdit(g)} className="p-1.5 rounded-full text-gray-400 flex-shrink-0"><Pencil size={15} /></button>
                                <button onClick={() => handleDelete(g)} className="p-1.5 rounded-full text-gray-400 flex-shrink-0"><Trash2 size={15} /></button>
                                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                            </div>
                        )
                    ))
                )}
            </div>
        </div>
    );
};

export default Collections;
