import React, { useState } from 'react';
import { X, Search, Loader2, ArrowLeftRight } from 'lucide-react';
import apiClient from '../utils/apiClient';

const getDisplayName = (user) => {
    const parts = [];
    if (user.breederName) parts.push(user.breederName);
    if (user.personalName && user.showPersonalName) parts.push(user.personalName);
    return parts.join(' / ') || String(user.id_public || '') || 'Unknown User';
};

// Self-contained transfer-ownership modal — mirrors crittertrack-frontend's
// TransferAnimalModal.jsx + useTransferWorkflow.ts, simplified (no budget/sale tracking
// integration, Lite doesn't have that feature) into one component with local state.
const TransferAnimalModal = ({ animal, onClose, onSubmitted, showError }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSearch = async () => {
        if (query.trim().length < 2) return;
        setSearching(true);
        setSearchPerformed(false);
        try {
            const response = await apiClient.get('/public/profiles/search', { params: { query: query.trim() } });
            setResults(response.data || []);
        } catch (error) {
            console.error('User search failed:', error);
            setResults([]);
        } finally {
            setSearching(false);
            setSearchPerformed(true);
        }
    };

    const handleSubmit = async () => {
        if (!selectedUser) return;
        setSubmitting(true);
        try {
            const payload = {
                animalId_public: animal.id_public,
                toUserId: selectedUser.userId_backend || selectedUser.id_public,
                price: price ? parseFloat(price) : 0,
                notes: notes || '',
                transferType: price && parseFloat(price) > 0 ? 'sale' : 'gift',
            };
            await apiClient.post('/transfers', payload);
            onSubmitted?.();
        } catch (error) {
            console.error('Transfer failed:', error);
            const msg = error.response?.status === 409
                ? 'This animal already has a pending transfer request.'
                : (error.response?.data?.message || 'Transfer failed. Please try again.');
            showError?.(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!animal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-dark-card-bg rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-dark-border">
                    <h2 className="text-base font-bold text-gray-800 dark:text-dark-text flex items-center gap-1.5">
                        <ArrowLeftRight size={18} /> Transfer Ownership
                    </h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-dark-text-muted"><X size={20} /></button>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Recipient</label>
                        {selectedUser ? (
                            <div className="mt-1 flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface">
                                <span className="text-sm text-gray-800 dark:text-dark-text">{getDisplayName(selectedUser)}</span>
                                <button onClick={() => setSelectedUser(null)} className="text-gray-400 dark:text-dark-text-muted"><X size={15} /></button>
                            </div>
                        ) : (
                            <>
                                <div className="mt-1 flex gap-2">
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                                        placeholder="Search by name or ID…"
                                        className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm outline-none"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={searching || query.trim().length < 2}
                                        className="px-3 rounded-lg bg-accent dark:bg-dark-accent text-white disabled:opacity-50 flex-shrink-0"
                                    >
                                        {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                    </button>
                                </div>
                                {searchPerformed && results.length === 0 && !searching && (
                                    <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1.5">No users found.</p>
                                )}
                                {results.length > 0 && (
                                    <div className="mt-1.5 border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                        {results.map((user) => (
                                            <button
                                                key={user.id_public}
                                                onClick={() => { setSelectedUser(user); setResults([]); }}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-surface border-b border-gray-100 dark:border-dark-border last:border-b-0"
                                            >
                                                <p className="text-sm font-medium text-gray-800 dark:text-dark-text">{getDisplayName(user)}</p>
                                                <p className="text-xs text-gray-400 dark:text-dark-text-muted">{user.id_public}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Sale Price (optional)</label>
                        <input
                            type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00"
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide">Notes (optional)</label>
                        <textarea
                            value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add a note for the recipient…"
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-sm outline-none resize-none"
                        />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-dark-text-muted">
                        The recipient must accept before ownership changes. You'll keep view-only access afterward.
                    </p>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-dark-border flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text font-semibold text-sm">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedUser || submitting}
                        className="flex-1 py-2.5 rounded-lg bg-accent dark:bg-dark-accent text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin" />} Send Request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferAnimalModal;
