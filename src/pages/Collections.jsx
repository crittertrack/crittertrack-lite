import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronDown, ChevronUp, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import TopBar from '../components/TopBar';
import AnimalCard from '../components/AnimalCard';
import AnimalImage from '../components/shared/AnimalImage';
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
    const [expandedId, setExpandedId] = useState(null);

    const fetchAnimals = useCallback(async () => {
        if (!authToken) return;
        setLoadingAnimals(true);
        try {
            const response = await apiClient.get('/animals');
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
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
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
                        className="flex-1 text-sm bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text rounded-lg px-3 py-2.5 shadow-sm outline-none"
                    />
                    <button type="submit" className="p-2.5 rounded-lg bg-accent dark:bg-dark-accent text-white flex-shrink-0"><Plus size={18} /></button>
                </form>

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : groups.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-dark-text-muted text-sm py-16">No collections yet. Create one above to start organizing your animals.</p>
                ) : (
                    groups.map((g) => (
                        editingId === g.id ? (
                            <form key={g.id} onSubmit={commitEdit} className="flex items-center gap-2 bg-white dark:bg-dark-card-bg rounded-xl p-3 shadow-sm">
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text outline-none"
                                />
                                <button type="submit" className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><Check size={16} /></button>
                                <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted"><X size={16} /></button>
                            </form>
                        ) : (
                            <div key={g.id} className="bg-white dark:bg-dark-card-bg rounded-xl shadow-sm overflow-hidden">
                                <div className="w-full flex items-center gap-2 p-3">
                                    <button
                                        onClick={() => setExpandedId((id) => (id === g.id ? null : g.id))}
                                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                                    >
                                        <div className="flex -space-x-3 flex-shrink-0">
                                            {g.matches.slice(0, 3).map((a) => (
                                                <div key={a.id_public} className="w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-dark-card-bg bg-gray-100 dark:bg-dark-surface">
                                                    <AnimalImage src={a.imageUrl || a.photoUrl} alt={a.name} iconSize={14} />
                                                </div>
                                            ))}
                                            {g.matches.length === 0 && <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-surface" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{g.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-dark-text-muted">{g.matches.length} animal{g.matches.length === 1 ? '' : 's'}</p>
                                        </div>
                                    </button>
                                    <button onClick={() => startEdit(g)} className="p-1.5 rounded-full text-gray-400 dark:text-dark-text-muted flex-shrink-0"><Pencil size={15} /></button>
                                    <button onClick={() => handleDelete(g)} className="p-1.5 rounded-full text-gray-400 dark:text-dark-text-muted flex-shrink-0"><Trash2 size={15} /></button>
                                    {expandedId === g.id ? <ChevronUp size={18} className="text-gray-300 dark:text-dark-text-muted flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-300 dark:text-dark-text-muted flex-shrink-0" />}
                                </div>
                                {expandedId === g.id && (
                                    <div className="px-3 pb-3 space-y-2">
                                        {g.matches.length === 0 ? (
                                            <p className="text-xs text-gray-400 dark:text-dark-text-muted text-center py-2">No animals in this collection yet.</p>
                                        ) : (
                                            g.matches.map((a) => (
                                                <AnimalCard key={a.id_public} animal={a} onOpen={(id) => navigate(`/animals/${id}`)} />
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    ))
                )}
            </div>
        </div>
    );
};

export default Collections;
