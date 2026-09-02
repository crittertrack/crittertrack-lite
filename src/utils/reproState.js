// Reproductive status pill shown on both AnimalCard and AnimalDetail — colors match
// the main site's AnimalModalV2 badge styling exactly.
export const getReproState = (animal) => {
    if (animal.isPregnant) return { label: 'Pregnant', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300' };
    if (animal.isNursing) return { label: 'Nursing', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300' };
    if (animal.isInMating) return { label: 'In Mating', color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300' };
    if (animal.isPlannedMating) return { label: 'Planned Mating', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' };
    return null;
};
