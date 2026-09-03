import React, { useState, useCallback, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import TopBar from '../components/TopBar';
import AnimalImage from '../components/shared/AnimalImage';

const PublicSearch = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const runSearch = useCallback(async (term) => {
        if (!term.trim()) { setResults([]); setSearched(false); return; }
        setLoading(true);
        try {
            const response = await apiClient.get('/public/global/animals', { params: { name: term.trim(), limit: 30 } });
            setResults(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to search public animals:', error);
            setResults([]);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, []);

    // Auto-run the search if the header search bar (BrandHeader) navigated here with a `?q=` param.
    useEffect(() => {
        const q = searchParams.get('q');
        if (q && q.trim()) runSearch(q);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        runSearch(query);
    };

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar title="Search Public Animals" onBack={() => navigate(-1)} />

            <form onSubmit={handleSubmit} className="px-4 pt-3">
                <div className="flex items-center gap-2 bg-white dark:bg-dark-card-bg rounded-full px-3 py-2 shadow-sm">
                    <Search size={16} className="text-gray-400 dark:text-dark-text-muted" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or ID..."
                        className="flex-1 text-sm outline-none bg-transparent text-gray-900 dark:text-dark-text"
                    />
                </div>
            </form>

            <div className="px-4 pt-3 space-y-2.5">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : !searched ? (
                    <p className="text-center text-gray-400 dark:text-dark-text-muted text-sm py-16">Search for another breeder's public animals by name or ID.</p>
                ) : results.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-dark-text-muted text-sm py-16">No public animals found.</p>
                ) : (
                    results.map((a) => (
                        <button
                            key={a.id_public}
                            onClick={() => navigate(`/animals/${a.id_public}`)}
                            className="w-full flex items-center gap-3 bg-white dark:bg-dark-card-bg rounded-xl p-2.5 shadow-sm text-left"
                        >
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-dark-surface">
                                <AnimalImage src={a.imageUrl || a.photoUrl} alt={a.name} iconSize={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">
                                    {[a.prefix, a.name || 'Unnamed', a.suffix].filter(Boolean).join(' ')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">{a.species} • {a.id_public}</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default PublicSearch;
