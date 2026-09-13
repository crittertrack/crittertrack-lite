import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, XCircle, User } from 'lucide-react';
import apiClient from '../utils/apiClient';
import TopBar from '../components/TopBar';
import AnimalImage from '../components/shared/AnimalImage';

const COUNTRY_NAMES = {
    US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia', NZ: 'New Zealand',
    DE: 'Germany', FR: 'France', IT: 'Italy', HU: 'Hungary', ES: 'Spain', NL: 'Netherlands',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', CH: 'Switzerland', BE: 'Belgium', AT: 'Austria',
    PL: 'Poland', CZ: 'Czech Republic', IE: 'Ireland', PT: 'Portugal', GR: 'Greece', RU: 'Russia',
    JP: 'Japan', KR: 'South Korea', CN: 'China', IN: 'India', BR: 'Brazil', MX: 'Mexico',
    ZA: 'South Africa', SG: 'Singapore', HK: 'Hong Kong', MY: 'Malaysia', TH: 'Thailand',
};

const getDisplayName = (profile) => {
    if (!profile) return 'Anonymous Breeder';
    const showPersonalName = profile.showPersonalName ?? false;
    const showBreederName = profile.showBreederName ?? false;
    if (showBreederName && showPersonalName && profile.personalName && profile.breederName) {
        return `${profile.personalName} (${profile.breederName})`;
    }
    if (showBreederName && profile.breederName) return profile.breederName;
    if (showPersonalName && profile.personalName) return profile.personalName;
    return 'Anonymous Breeder';
};

// Lightweight native counterpart to crittertrack-frontend's PublicProfileView — deliberately
// scoped to just identity info + their public animals (no ratings/litters/QR/contact tabs).
const PublicProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setNotFound(false);
        (async () => {
            try {
                const [profileRes, animalsRes] = await Promise.all([
                    apiClient.get(`/public/profile/${userId}`),
                    apiClient.get(`/public/animals/${userId}`),
                ]);
                if (cancelled) return;
                setProfile(profileRes.data);
                setAnimals(Array.isArray(animalsRes.data) ? animalsRes.data : []);
            } catch (error) {
                console.error('Profile not found or not public:', error);
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-page-bg dark:bg-dark-bg flex items-center justify-center">
                <Loader2 className="animate-spin text-accent" size={28} />
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
                <TopBar title="Profile" onBack={() => navigate(-1)} />
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <XCircle size={48} className="text-red-400 mb-3" />
                    <p className="text-gray-600 dark:text-dark-text-secondary text-sm">This profile either doesn't exist or isn't publicly visible.</p>
                </div>
            </div>
        );
    }

    const displayName = getDisplayName(profile);
    const location = profile.country
        ? `${COUNTRY_NAMES[profile.country] || profile.country}${profile.country === 'US' && profile.state ? `, ${profile.state}` : ''}`
        : null;

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <TopBar title={displayName} onBack={() => navigate(-1)} />

            <div className="p-4">
                <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-sm p-4 flex items-center gap-4">
                    {profile.profileImage ? (
                        <img src={profile.profileImage} alt={displayName} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-dark-surface flex items-center justify-center flex-shrink-0">
                            <User size={28} className="text-gray-400 dark:text-dark-text-muted" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-base font-bold text-gray-800 dark:text-dark-text truncate">{displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted font-mono">{profile.id_public}</p>
                        {location && <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">{location}</p>}
                    </div>
                </div>

                {(profile.showBio ?? true) && profile.bio && (
                    <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-sm p-4 mt-3">
                        <p className="text-sm text-gray-700 dark:text-dark-text-secondary whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                )}

                <p className="text-xs font-semibold text-gray-500 dark:text-dark-text-muted uppercase tracking-wide mt-4 mb-2">
                    Public Animals ({animals.length})
                </p>

                {animals.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-dark-text-muted text-sm py-10">No public animals shared.</p>
                ) : (
                    <div className="space-y-2.5">
                        {animals.map((a) => (
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicProfile;
