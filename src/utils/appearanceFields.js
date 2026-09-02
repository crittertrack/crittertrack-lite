// Same category-based label renames the main site applies (see
// crittertrack-frontend/src/utils/speciesFieldTemplates.js FIELD_LABEL_OVERRIDES),
// scoped to just the 7 appearance fields Lite exposes on creation and in edit.
const FIELD_ORDER = ['color', 'markings', 'earset', 'coat', 'eyeColor', 'carrierTraits', 'body'];

const DEFAULT_LABELS = {
    color: 'Color',
    markings: 'Markings',
    earset: 'Earset',
    coat: 'Coat Type',
    eyeColor: 'Eye Color',
    carrierTraits: 'Carrier Traits',
    body: 'Body',
};

const LABEL_OVERRIDES = {
    color: { Reptile: 'Morph', Amphibian: 'Morph', Fish: 'Morph', Invertebrate: 'Morph' },
    coat: { Reptile: 'Scalation', Bird: 'Plumage', Amphibian: 'Skin', Fish: 'Skin', Invertebrate: 'Coloring' },
    markings: { Reptile: 'Scale Pattern', Bird: 'Plumage Pattern', Amphibian: 'Skin Pattern', Fish: 'Skin Pattern', Invertebrate: 'Skin Pattern' },
};

// Matches AnimalFormModalV2.jsx: Earset only shows for species literally named Rat/Fancy Rat,
// not category-wide (main site's HIDDEN_FIELDS_BY_CATEGORY hides it everywhere except
// Mammal/Other, but within Mammal only rats actually get the field rendered in the form).
const EARSET_SPECIES = ['Rat', 'Fancy Rat'];

export const getSpeciesCategory = (speciesList, speciesName) =>
    speciesList.find((s) => s.name === speciesName)?.category || 'Other';

export const getAppearanceFields = (category, speciesName) =>
    FIELD_ORDER
        .filter((key) => key !== 'earset' || EARSET_SPECIES.includes(speciesName))
        .map((key) => ({ key, label: LABEL_OVERRIDES[key]?.[category] || DEFAULT_LABELS[key] }));

