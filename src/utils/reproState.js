// Reproductive status pill shown on both AnimalCard and AnimalDetail — colors match
// the main site's AnimalModalV2 badge styling exactly.
export const getReproState = (animal) => {
    if (animal.isPregnant) return { label: 'Pregnant', color: 'bg-pink-100 text-pink-800' };
    if (animal.isNursing) return { label: 'Nursing', color: 'bg-violet-100 text-violet-800' };
    if (animal.isInMating) return { label: 'In Mating', color: 'bg-sky-100 text-sky-800' };
    if (animal.isPlannedMating) return { label: 'Planned Mating', color: 'bg-indigo-100 text-indigo-800' };
    return null;
};
