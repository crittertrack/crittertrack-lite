import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';

// Shared collections state (definitions + animal assignments), synced to the same
// GET/PUT /api/collections endpoint the main site uses, so Lite stays data-compatible.
export const useCollections = (authToken) => {
    const [collections, setCollections] = useState([]);
    const [animalMap, setAnimalMap] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchCollections = useCallback(async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            const res = await apiClient.get('/collections');
            setCollections(Array.isArray(res.data?.collections) ? res.data.collections : []);
            setAnimalMap((res.data?.animalMap && typeof res.data.animalMap === 'object') ? res.data.animalMap : {});
        } catch (error) {
            console.error('Failed to fetch collections:', error);
        } finally {
            setLoading(false);
        }
    }, [authToken]);

    useEffect(() => { fetchCollections(); }, [fetchCollections]);

    const persist = useCallback((cols, map) => {
        setCollections(cols);
        setAnimalMap(map);
        apiClient.put('/collections', { collections: cols, animalMap: map })
            .catch((error) => console.error('Failed to save collections:', error));
    }, [authToken]);

    // assignToAnimalId lets a single persist call both create the collection and assign an
    // animal to it, avoiding a stale-closure race if the caller assigns immediately after.
    const createCollection = useCallback((name, assignToAnimalId) => {
        if (!name.trim()) return null;
        const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const nextMap = assignToAnimalId
            ? { ...animalMap, [assignToAnimalId]: [...(animalMap[assignToAnimalId] || []), id] }
            : animalMap;
        persist([...collections, { id, name: name.trim() }], nextMap);
        return id;
    }, [collections, animalMap, persist]);

    const renameCollection = useCallback((id, name) => {
        if (!name.trim()) return;
        persist(collections.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)), animalMap);
    }, [collections, animalMap, persist]);

    const deleteCollection = useCallback((id) => {
        const nextMap = { ...animalMap };
        Object.keys(nextMap).forEach((aid) => { nextMap[aid] = (nextMap[aid] || []).filter((cid) => cid !== id); });
        persist(collections.filter((c) => c.id !== id), nextMap);
    }, [collections, animalMap, persist]);

    const assignAnimal = useCallback((animalId, collectionId) => {
        const current = animalMap[animalId] || [];
        if (current.includes(collectionId)) return;
        persist(collections, { ...animalMap, [animalId]: [...current, collectionId] });
    }, [collections, animalMap, persist]);

    const unassignAnimal = useCallback((animalId, collectionId) => {
        const current = animalMap[animalId] || [];
        persist(collections, { ...animalMap, [animalId]: current.filter((cid) => cid !== collectionId) });
    }, [collections, animalMap, persist]);

    return {
        collections,
        animalMap,
        loading,
        fetchCollections,
        createCollection,
        renameCollection,
        deleteCollection,
        assignAnimal,
        unassignAnimal,
    };
};
