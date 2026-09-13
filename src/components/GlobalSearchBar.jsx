import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Loader2 } from 'lucide-react';
import apiClient from '../utils/apiClient';
import AnimalImage from './shared/AnimalImage';

// Ported from crittertrack-frontend's GlobalSearchBar (component of the same name) — live,
// debounced dropdown searching both public profiles and public animals together, with the
// same CTU/CTC/CT ID-pattern detection so pasting a full CTUID/CTCID narrows to that type.
const GlobalSearchBar = ({ onSelectUser, onSelectAnimal, className = '' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [animalResults, setAnimalResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);
    const debounceTimerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = async (term) => {
        if (!term || term.trim().length < 2) {
            setUserResults([]);
            setAnimalResults([]);
            setShowResults(false);
            return;
        }

        setLoading(true);
        setShowResults(true);

        try {
            const trimmedTerm = term.trim();

            const hasCTU = /CTU/i.test(trimmedTerm);
            const hasCTC = /CTC/i.test(trimmedTerm);
            const hasCT = /^CT[- ]?\d+$/i.test(trimmedTerm);
            const isNumericOnly = /^\d+$/.test(trimmedTerm);
            const numericMatch = trimmedTerm.match(/(\d+)/);
            const numericId = numericMatch ? numericMatch[1] : null;

            let userUrl = null;
            let animalUrl = null;

            if (hasCTU && numericId) {
                userUrl = `/public/profiles/search?query=${encodeURIComponent(`CTU${numericId}`)}&limit=10`;
            } else if (hasCTC && numericId) {
                animalUrl = `/public/global/animals?id_public=${encodeURIComponent(`CTC${numericId}`)}`;
            } else if ((hasCT || isNumericOnly) && numericId) {
                userUrl = `/public/profiles/search?query=${encodeURIComponent(`CTU${numericId}`)}&limit=10`;
                animalUrl = `/public/global/animals?id_public=${encodeURIComponent(`CTC${numericId}`)}`;
            } else {
                userUrl = `/public/profiles/search?query=${encodeURIComponent(trimmedTerm)}&limit=10`;
                animalUrl = `/public/global/animals?name=${encodeURIComponent(trimmedTerm)}&species=${encodeURIComponent(trimmedTerm)}&limit=10`;
            }

            const [usersResponse, animalsResponse] = await Promise.all([
                userUrl ? apiClient.get(userUrl) : Promise.resolve({ data: [] }),
                animalUrl ? apiClient.get(animalUrl) : Promise.resolve({ data: [] }),
            ]);

            // Filter out completely anonymous users (both names hidden/unavailable)
            const filteredUsers = (usersResponse.data || []).filter((user) => {
                const hasPersonalName = (user.showPersonalName ?? false) && user.personalName;
                const hasBreederName = (user.showBreederName ?? false) && user.breederName;
                return hasPersonalName || hasBreederName;
            });

            setUserResults(filteredUsers);
            setAnimalResults(animalsResponse.data || []);
        } catch (error) {
            console.error('Search error:', error);
            setUserResults([]);
            setAnimalResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => performSearch(value), 300);
    };

    const handleUserClick = (user) => {
        setShowResults(false);
        setSearchTerm('');
        onSelectUser(user);
    };

    const handleAnimalClick = (animal) => {
        setShowResults(false);
        setSearchTerm('');
        onSelectAnimal(animal);
    };

    const getDisplayName = (user) => {
        const showPersonalName = user.showPersonalName ?? false;
        const showBreederName = user.showBreederName ?? false;
        if (showBreederName && showPersonalName && user.personalName && user.breederName) {
            return `${user.personalName} (${user.breederName})`;
        }
        if (showBreederName && user.breederName) return user.breederName;
        if (showPersonalName && user.personalName) return user.personalName;
        return 'Anonymous Breeder';
    };

    const totalResults = userResults.length + animalResults.length;

    return (
        <div ref={searchRef} className={`relative ${className}`}>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-surface rounded-full px-3 py-2">
                <Search size={16} className="text-gray-400 dark:text-dark-text-muted flex-shrink-0" />
                <input
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchTerm.trim().length >= 2 && setShowResults(true)}
                    placeholder="Search users, animals, IDs…"
                    className="flex-1 min-w-0 text-sm outline-none bg-transparent text-gray-900 dark:text-dark-text"
                />
                {loading && <Loader2 size={16} className="text-gray-400 dark:text-dark-text-muted animate-spin flex-shrink-0" />}
            </div>

            {showResults && searchTerm.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card-bg rounded-lg shadow-xl border border-gray-200 dark:border-dark-border max-h-96 overflow-y-auto z-50">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500 dark:text-dark-text-muted">
                            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                            <p className="text-sm">Searching…</p>
                        </div>
                    ) : totalResults === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-dark-text-muted">
                            <p className="text-sm">No results found for "{searchTerm}"</p>
                        </div>
                    ) : (
                        <>
                            {userResults.length > 0 && (
                                <div className="border-b border-gray-100 dark:border-dark-border">
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-dark-surface text-xs font-semibold text-gray-600 dark:text-dark-text-secondary uppercase tracking-wide">
                                        Users ({userResults.length})
                                    </div>
                                    {userResults.map((user) => (
                                        <div
                                            key={user.id_public}
                                            className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-surface-hover cursor-pointer transition flex items-center gap-3"
                                            onClick={() => handleUserClick(user)}
                                        >
                                            {user.profileImage ? (
                                                <img src={user.profileImage} alt={getDisplayName(user)} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-200 dark:bg-dark-surface rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <User size={20} className="text-gray-400 dark:text-dark-text-muted" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{getDisplayName(user)}</p>
                                                <p className="text-xs text-gray-500 dark:text-dark-text-muted font-mono">{user.id_public}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {animalResults.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-dark-surface text-xs font-semibold text-gray-600 dark:text-dark-text-secondary uppercase tracking-wide">
                                        Animals ({animalResults.length})
                                    </div>
                                    {animalResults.map((animal) => (
                                        <div
                                            key={animal.id_public}
                                            className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-surface-hover cursor-pointer transition flex items-center gap-3"
                                            onClick={() => handleAnimalClick(animal)}
                                        >
                                            <div className="w-10 h-10 bg-gray-200 dark:bg-dark-surface rounded-lg overflow-hidden flex-shrink-0">
                                                <AnimalImage src={animal.imageUrl || animal.photoUrl} alt={animal.name} className="w-full h-full object-cover" iconSize={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">
                                                    {animal.prefix && `${animal.prefix} `}{animal.name}{animal.suffix && ` ${animal.suffix}`}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">
                                                    {animal.species} · {animal.gender} · {animal.id_public}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearchBar;
