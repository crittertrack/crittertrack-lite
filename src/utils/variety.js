// Same appearance fields the main app combines into a "Variety" label.
const VARIETY_KEYS = ['color', 'markings', 'earset', 'coat', 'eyeColor', 'carrierTraits', 'body'];

export const getVariety = (animal) => VARIETY_KEYS.map((k) => animal[k]).filter(Boolean).join(' ');
