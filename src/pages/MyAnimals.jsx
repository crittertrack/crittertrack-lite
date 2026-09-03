import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Loader2, X, Archive } from 'lucide-react';
import TopBar from '../components/TopBar';
import AnimalCard from '../components/AnimalCard';
import QuickAddAnimalModal from '../components/QuickAddAnimalModal';
import { parseLocalDate } from '../utils/dateFormatter';
import { useCollections } from '../hooks/useCollections';

const GENDER_OPTIONS = ['All Genders', 'Male', 'Female', 'Intersex', 'Mixed', 'Unknown'];
const STATUS_OPTIONS = ['All Statuses', 'Pet', 'Growout', 'Breeder', 'Available', 'Booked', 'Retired', 'Deceased', 'Rehomed', 'Unknown'];
const SORT_OPTIONS = [
    { key: 'name-asc', label: 'Name (A-Z)' },
    { key: 'name-desc', label: 'Name (Z-A)' },
    { key: 'age-asc', label: 'Age (Youngest)' },
    { key: 'age-desc', label: 'Age (Oldest)' },
];
const DEFAULT_FILTERS = { search: '', speciesFilter: 'All Species', genderFilter: 'All Genders', statusFilter: 'All Statuses', sortBy: 'age-asc' };
const FILTERS_STORAGE_KEY = 'ct_lite_myanimals_filters';

// Persists search/species/gender/status/sort across navigation and app restarts, since users
// often tap into an animal and back and don't want to re-set their filters every time.
const loadStoredFilters = () => {
    try {
        const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
        return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
    } catch {
        return DEFAULT_FILTERS;
    }
};

// Collection keys match Collections.jsx so /animals?collection=X can be deep-linked into.

const MyAnimals = ({ authToken }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const collectionKey = searchParams.get('collection');
    const { collections, animalMap } = useCollections(authToken);

    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ownedMode, setOwnedMode] = useState('owned'); // 'owned' | 'all'
    const [storedFilters] = useState(loadStoredFilters);
    const [search, setSearch] = useState(storedFilters.search);
    const [speciesFilter, setSpeciesFilter] = useState(storedFilters.speciesFilter);
    const [genderFilter, setGenderFilter] = useState(storedFilters.genderFilter);
    const [statusFilter, setStatusFilter] = useState(storedFilters.statusFilter);
    const [sortBy, setSortBy] = useState(storedFilters.sortBy);
    const [showAdd, setShowAdd] = useState(false);

    // The input itself always updates instantly on `search`; the actual filtering (which
    // mounts/unmounts a whole page of cards+images and was the source of visible typing lag)
    // only runs against `debouncedSearch`, a beat after the user stops typing.
    const [debouncedSearch, setDebouncedSearch] = useState(storedFilters.search);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 200);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ search, speciesFilter, genderFilter, statusFilter, sortBy }));
    }, [search, speciesFilter, genderFilter, statusFilter, sortBy]);

    const hasActiveFilters = search.trim() !== '' || speciesFilter !== DEFAULT_FILTERS.speciesFilter
        || genderFilter !== DEFAULT_FILTERS.genderFilter || statusFilter !== DEFAULT_FILTERS.statusFilter
        || sortBy !== DEFAULT_FILTERS.sortBy;

    const clearFilters = () => {
        setSearch(DEFAULT_FILTERS.search);
        setSpeciesFilter(DEFAULT_FILTERS.speciesFilter);
        setGenderFilter(DEFAULT_FILTERS.genderFilter);
        setStatusFilter(DEFAULT_FILTERS.statusFilter);
        setSortBy(DEFAULT_FILTERS.sortBy);
    };


    const fetchAnimals = useCallback(async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            // No isOwned param: matches the main site's My Animals fetch, which loads everything
            // the user created (archived excluded server-side by default) and then separates
            // owned vs. not-owned client-side so the toggle doesn't require a refetch.
            const response = await apiClient.get('/animals');
            const data = Array.isArray(response.data) ? response.data : [];
            // isViewOnly = creatorId !== requesting user, i.e. transferred-in/out animals.
            setAnimals(data.filter((a) => !a.isViewOnly));
        } catch (error) {
            console.error('Failed to fetch animals:', error);
        } finally {
            setLoading(false);
        }
    }, [authToken]);

    useEffect(() => { fetchAnimals(); }, [fetchAnimals]);

    // Stable reference so React.memo on AnimalCard actually prevents re-rendering unrelated
    // cards on every search/filter keystroke (a new inline closure per render would defeat memo).
    const handleOpenAnimal = useCallback((id) => navigate(`/animals/${id}`), [navigate]);

    const speciesOptions = useMemo(() => {
        const unique = Array.from(new Set(animals.map((a) => a.species).filter(Boolean))).sort();
        return ['All Species', ...unique];
    }, [animals]);

    // Count reflects only the owned/all toggle, not the species/gender/status/search filters below.
    const totalCount = useMemo(() => (
        ownedMode === 'owned' ? animals.filter((a) => a.isOwned !== false).length : animals.length
    ), [animals, ownedMode]);

    const filtered = useMemo(() => {
        // 'owned' hides animals manually marked isOwned:false (e.g. pedigree placeholder
        // ancestors); 'all' shows everything the user created, still minus transferred/archived.
        let list = ownedMode === 'owned' ? animals.filter((a) => a.isOwned !== false) : animals;
        if (collectionKey) {
            list = list.filter((a) => (animalMap[a.id_public] || []).includes(collectionKey));
        }
        if (speciesFilter !== 'All Species') list = list.filter((a) => a.species === speciesFilter);
        if (genderFilter !== 'All Genders') list = list.filter((a) => a.gender === genderFilter);
        if (statusFilter !== 'All Statuses') list = list.filter((a) => a.status === statusFilter);
        if (debouncedSearch.trim()) {
            const q = debouncedSearch.trim().toLowerCase();
            list = list.filter((a) =>
                [a.name, a.prefix, a.suffix, a.species, a.id_public].filter(Boolean).some((v) => v.toLowerCase().includes(q))
            );
        }

        const displayName = (a) => [a.prefix, a.name, a.suffix].filter(Boolean).join(' ').toLowerCase();
        const birthTime = (a) => (a.birthDate ? parseLocalDate(a.birthDate).getTime() : null);

        const sorted = [...list].sort((a, b) => {
            if (sortBy === 'name-asc') return displayName(a).localeCompare(displayName(b));
            if (sortBy === 'name-desc') return displayName(b).localeCompare(displayName(a));
            const aTime = birthTime(a);
            const bTime = birthTime(b);
            if (aTime === null && bTime === null) return 0;
            if (aTime === null) return 1; // unknown age sorts last
            if (bTime === null) return -1;
            // Youngest = most recent birthDate first; Oldest = earliest birthDate first.
            return sortBy === 'age-asc' ? bTime - aTime : aTime - bTime;
        });
        return sorted;
    }, [animals, ownedMode, speciesFilter, genderFilter, statusFilter, sortBy, debouncedSearch, collectionKey, animalMap]);

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar
                title={
                    collectionKey
                        ? (collections.find((c) => c.id === collectionKey)?.name || 'Collection')
                        : (
                            <span className="inline-flex items-center gap-2">
                                My Animals ({totalCount})
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="inline-flex items-center gap-0.5 text-[11px] font-semibold bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 transition"
                                    >
                                        <X size={11} /> Clear
                                    </button>
                                )}
                            </span>
                        )
                }
                onBack={collectionKey ? () => { searchParams.delete('collection'); setSearchParams(searchParams); } : undefined}
                safeAreaTop={false}
                right={
                    !collectionKey && (
                        <div className="flex items-center gap-2">
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
                            <button
                                onClick={() => navigate('/archive')}
                                className="p-1.5 rounded-full bg-white/20"
                                title="Archived & sold animals"
                            >
                                <Archive size={16} />
                            </button>
                        </div>
                    )
                }
            />

            <div className="px-4 pt-3 space-y-3">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-muted" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search animals…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text shadow-sm text-sm focus:outline-none"
                    />
                </div>

                {!collectionKey && (
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={speciesFilter}
                            onChange={(e) => setSpeciesFilter(e.target.value)}
                            className="px-2 py-2 rounded-lg bg-white dark:bg-dark-card-bg shadow-sm text-xs font-semibold text-gray-600 dark:text-dark-text-secondary focus:outline-none"
                        >
                            {speciesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value)}
                            className="px-2 py-2 rounded-lg bg-white dark:bg-dark-card-bg shadow-sm text-xs font-semibold text-gray-600 dark:text-dark-text-secondary focus:outline-none"
                        >
                            {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-2 py-2 rounded-lg bg-white dark:bg-dark-card-bg shadow-sm text-xs font-semibold text-gray-600 dark:text-dark-text-secondary focus:outline-none"
                        >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-2 py-2 rounded-lg bg-white dark:bg-dark-card-bg shadow-sm text-xs font-semibold text-gray-600 dark:text-dark-text-secondary focus:outline-none"
                        >
                            {SORT_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-dark-text-muted text-sm">No animals found.</div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((animal) => (
                            <AnimalCard key={animal.id_public} animal={animal} onOpen={handleOpenAnimal} />
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={() => setShowAdd(true)}
                className="fixed bottom-20 right-4 bg-accent dark:bg-dark-accent text-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 font-semibold text-sm z-20"
            >
                <Plus size={18} /> Add Animal
            </button>

            {showAdd && (
                <QuickAddAnimalModal
                    authToken={authToken}
                    onClose={() => setShowAdd(false)}
                    onCreated={() => { setShowAdd(false); fetchAnimals(); }}
                />
            )}
        </div>
    );
};

export default MyAnimals;
