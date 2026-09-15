import React from 'react';

// Hand-drawn rainbow (not lucide's single-tone icon) so each arc gets its own hue \u2014 a
// "Rainbow Bridge" memorial motif, deliberately not a ribbon, to avoid resembling SimpleBreed's.
const RainbowIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 17a10 10 0 0 0-20 0" stroke="#f87171" />
        <path d="M6 17a6 6 0 0 1 12 0" stroke="#facc15" />
        <path d="M10 17a2 2 0 0 1 4 0" stroke="#60a5fa" />
    </svg>
);

// A "DECEASED" bar for animal photos/cards, in place of a plain status label.
// variant="bar" (default) sits inline as its own section (e.g. under a card's photo);
// variant="overlay" is absolutely positioned across the bottom of a photo container
// (the container must have `relative` + `overflow-hidden`).
const DeceasedBanner = ({ size = 'md', variant = 'bar' }) => {
    const isSm = size === 'sm';
    return (
        <div
            className={`${variant === 'overlay' ? 'absolute bottom-0 left-0 right-0' : 'w-full mt-auto'} bg-gray-800/90 dark:bg-black/80 flex items-center justify-center gap-1.5 ${isSm ? 'py-0.5' : 'py-1.5'}`}
        >
            <span className={`font-bold tracking-wide text-white uppercase ${isSm ? 'text-[9px]' : 'text-xs sm:text-sm'}`}>Deceased</span>
            <RainbowIcon size={isSm ? 12 : 16} />
        </div>
    );
};

export default DeceasedBanner;
