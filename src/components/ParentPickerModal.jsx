import React, { useState } from 'react';
import axios from 'axios';
import { X, Loader2, Search } from 'lucide-react';
import AnimalImage from './shared/AnimalImage';
import { API_BASE_URL } from '../utils/apiConfig';

// Searches the user's own animals + the public global directory (same pattern as PublicSearch.jsx),
// for assigning an existing animal as a sire/dam on AnimalDetail.jsx's Pedigree tab.
const ParentPickerModal = ({ title, requiredGenders, currentAnimalId, authToken, onSelect, onClose }) => {
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
            const [ownRes, globalRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/animals`, { params: { name: q }, headers: { Authorization: `Bearer ${authToken}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_BASE_URL}/public/global/animals`, { params: { name: q, limit: 20 } }).catch(() => ({ data: [] })),
            ]);
            const own = (Array.isArray(ownRes.data) ? ownRes.data : []).map((a) => ({ ...a, _own: true }));
            const ownIds = new Set(own.map((a) => a.id_public));
            const global = (Array.isArray(globalRes.data) ? globalRes.data : []).filter((a) => !ownIds.has(a.id_public));
            const combined = [...own, ...global].filter((a) =>
                a.id_public !== currentAnimalId && (!requiredGenders || requiredGenders.includes(a.gender))
            );
            setResults(combined);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-sm rounded-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-base font-bold text-gray-800 flex-1 truncate">{title}</h2>
                    <button type="button" onClick={onClose} className="p-1 text-gray-400"><X size={20} /></button>
                </div>
                <form onSubmit={runSearch} className="px-4 pt-3 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                            autoFocus
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder="Search by name or ID..."
                            className="flex-1 text-sm outline-none bg-transparent"
                        />
                    </div>
                </form>
                <div className="overflow-y-auto px-4 py-3 space-y-1" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent" size={24} /></div>
                    ) : !searched ? (
                        <p className="text-center text-xs text-gray-400 py-8">Search your animals or the public directory.</p>
                    ) : results.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-8">No matching animals found.</p>
                    ) : results.map((a) => (
                        <button
                            key={a.id_public}
                            type="button"
                            onClick={() => onSelect(a)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left"
                        >
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <AnimalImage src={a.imageUrl || a.photoUrl} alt={a.name} iconSize={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                    {[a.prefix, a.name, a.suffix].filter(Boolean).join(' ') || 'Unnamed'}
                                </p>
                                <p className="text-xs text-gray-400">{a.species} · {a.gender} · {a.id_public}</p>
                            </div>
                            {!a._own && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-gray-900 flex-shrink-0">Public</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ParentPickerModal;
