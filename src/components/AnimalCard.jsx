import React from 'react';
import { Mars, Venus } from 'lucide-react';
import AnimalImage from '../components/shared/AnimalImage';
import { calculateAgeDetailed, formatDateShort } from '../utils/dateFormatter';
import { getVariety } from '../utils/variety';
import { getReproState } from '../utils/reproState';

const STATUS_STYLES = {
    Breeder: 'bg-accent/10 text-accent',
    Available: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    Growout: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    Retired: 'bg-gray-200 dark:bg-dark-surface-hover text-gray-600 dark:text-dark-text-secondary',
    Booked: 'bg-info-bg dark:bg-dark-info-blue/30 text-info-blue-dark dark:text-blue-300',
    Deceased: 'bg-gray-300 dark:bg-dark-surface-hover text-gray-700 dark:text-dark-text-secondary',
    Rehomed: 'bg-gray-200 dark:bg-dark-surface-hover text-gray-600 dark:text-dark-text-secondary',
    Pet: 'bg-pedigree-female-bg dark:bg-dark-accent/20 text-accent',
};

const GenderIcon = ({ gender }) => {
    if (gender === 'Male') return <Mars size={13} className="text-info-blue" />;
    if (gender === 'Female') return <Venus size={13} className="text-accent" />;
    return null;
};

const AnimalCard = ({ animal, onClick }) => {
    const age = calculateAgeDetailed(animal.birthDate);
    const variety = getVariety(animal) || animal.species;
    const reproState = getReproState(animal);
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 bg-white dark:bg-dark-card-bg rounded-xl p-2.5 shadow-sm text-left active:scale-[0.99] transition"
        >
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-dark-surface">
                <AnimalImage src={animal.imageUrl || animal.photoUrl} alt={animal.name} iconSize={20} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate flex items-center gap-1">
                    <GenderIcon gender={animal.gender} />
                    {[animal.prefix, animal.name || 'Unnamed', animal.suffix].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">{variety}</p>
                {age && <p className="text-xs text-gray-400 dark:text-dark-text-muted">{formatDateShort(animal.birthDate)} - {age.label || age}</p>}
            </div>
            {(reproState || animal.status) && (
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {reproState && (
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${reproState.color}`}>
                            {reproState.label}
                        </span>
                    )}
                    {animal.status && (
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[animal.status] || 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-text-secondary'}`}>
                            {animal.status}
                        </span>
                    )}
                </div>
            )}
        </button>
    );
};

export default AnimalCard;
