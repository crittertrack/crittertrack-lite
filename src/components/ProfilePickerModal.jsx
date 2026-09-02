import React, { useState } from 'react';
import axios from 'axios';
import { X, Loader2, Search } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';

// Searches public breeder/owner profiles by name or CTUID, for linking Breeder/Owner
// fields on AnimalDetail.jsx (mirrors ParentPickerModal.jsx's search-and-select pattern).
const ProfilePickerModal = ({ title, onSelect, onClose }) => {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const runSearch = async (e) => {
        e.preventDefault();
        const q = term.trim();
        if (!q) return;
        setLoading(true);
        setSearched(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/public/profiles/search`, { params: { query: q, limit: 20 } });
            setResults(Array.isArray(res.data) ? res.data : []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-card-bg w-full max-w-sm rounded-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-dark-border flex-shrink-0">
                    <h2 className="text-base font-bold text-gray-800 dark:text-dark-text flex-1 truncate">{title}</h2>
                    <button type="button" onClick={onClose} className="p-1 text-gray-400 dark:text-dark-text-muted"><X size={20} /></button>
                </div>
                <form onSubmit={runSearch} className="px-4 pt-3 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark-surface rounded-full px-3 py-2">
                        <Search size={14} className="text-gray-400 dark:text-dark-text-muted" />
                        <input
                            autoFocus
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder="Search by name or CTUID..."
                            className="flex-1 text-sm outline-none bg-transparent text-gray-900 dark:text-dark-text"
                        />
                    </div>
                </form>
                <div className="overflow-y-auto px-4 py-3 space-y-1" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent" size={24} /></div>
                    ) : !searched ? (
                        <p className="text-center text-xs text-gray-400 dark:text-dark-text-muted py-8">Search by breeder/owner name or CTUID.</p>
                    ) : results.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 dark:text-dark-text-muted py-8">No matching profiles found.</p>
                    ) : results.map((p) => (
                        <button
                            key={p.id_public}
                            type="button"
                            onClick={() => onSelect(p)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface text-left"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{p.breederName || p.personalName || 'Unnamed'}</p>
                                <p className="text-xs text-gray-400 dark:text-dark-text-muted">{p.id_public}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfilePickerModal;
