import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArchiveRestore, Inbox } from 'lucide-react';
import apiClient from '../utils/apiClient';
import TopBar from '../components/TopBar';
import AnimalImage from '../components/shared/AnimalImage';
import { formatDateShort } from '../utils/dateFormatter';

// Simple, self-contained row — deliberately NOT reusing the shared AnimalCard component
// (which is React.memo'd, performance-critical for MyAnimals, and has no "extras" slot for
// an Unarchive button), to avoid any risk of regressing that list.
const ArchiveRow = ({ animal, onOpen, onUnarchive, unarchiving, readOnly }) => (
    <div className="w-full flex items-center gap-3 bg-white dark:bg-dark-card-bg rounded-xl p-2.5 shadow-sm">
        <button onClick={() => onOpen(animal.id_public)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-dark-surface">
                <AnimalImage src={animal.imageUrl || animal.photoUrl} alt={animal.name} iconSize={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">
                    {[animal.prefix, animal.name || 'Unnamed', animal.suffix].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">{animal.species}</p>
                {animal.birthDate && <p className="text-xs text-gray-400 dark:text-dark-text-muted">{formatDateShort(animal.birthDate)}</p>}
            </div>
        </button>
        {!readOnly && (
            <button
                onClick={() => onUnarchive(animal.id_public)}
                disabled={unarchiving}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-accent dark:bg-dark-accent text-white disabled:opacity-50 flex-shrink-0"
            >
                {unarchiving ? <Loader2 size={12} className="animate-spin" /> : <ArchiveRestore size={12} />} Unarchive
            </button>
        )}
        {readOnly && animal.soldStatus && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-200 dark:bg-dark-surface-hover text-gray-600 dark:text-dark-text-secondary flex-shrink-0 capitalize">
                {animal.soldStatus}
            </span>
        )}
    </div>
);

const Archive = ({ authToken }) => {
    const navigate = useNavigate();
    const [archived, setArchived] = useState([]);
    const [soldTransferred, setSoldTransferred] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('archived');
    const [unarchivingId, setUnarchivingId] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const response = await apiClient.get('/animals/archived');
            setArchived(response.data?.archived || []);
            setSoldTransferred(response.data?.soldTransferred || []);
        } catch (error) {
            console.error('Failed to load archived animals:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUnarchive = async (id_public) => {
        setUnarchivingId(id_public);
        try {
            await apiClient.put(`/animals/${id_public}`, { archived: false });
            setArchived((prev) => prev.filter((a) => a.id_public !== id_public));
            window.dispatchEvent(new Event('animals-changed'));
        } catch (error) {
            console.error('Failed to unarchive animal:', error);
        } finally {
            setUnarchivingId(null);
        }
    };

    const list = tab === 'archived' ? archived : soldTransferred;

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-8">
            <TopBar title="Archive" onBack={() => navigate(-1)} />
            <div className="flex justify-center gap-1 px-4 mt-3 mb-3">
                {[
                    { key: 'archived', label: `Archived (${archived.length})` },
                    { key: 'sold', label: `Sold / Transferred (${soldTransferred.length})` },
                ].map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 text-xs font-semibold py-2 rounded-full transition ${
                            tab === t.key ? 'bg-accent dark:bg-dark-accent text-white' : 'bg-white dark:bg-dark-card-bg text-gray-600 dark:text-dark-text-secondary'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="px-4 space-y-2">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent" size={24} /></div>
                ) : list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-dark-text-muted">
                        <Inbox size={32} className="mb-2" />
                        <p className="text-sm">{tab === 'archived' ? 'No archived animals.' : 'No sold or transferred animals.'}</p>
                    </div>
                ) : (
                    list.map((animal) => (
                        <ArchiveRow
                            key={animal.id_public}
                            animal={animal}
                            onOpen={(id) => navigate(`/animals/${id}`)}
                            onUnarchive={handleUnarchive}
                            unarchiving={unarchivingId === animal.id_public}
                            readOnly={tab === 'sold'}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default Archive;
