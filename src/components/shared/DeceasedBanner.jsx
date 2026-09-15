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

// Small circular badge for the rainbow icon, absolutely positioned in a photo's corner
// (parent photo container needs `relative`) — mirrors the ribbon's corner placement in the
// SimpleBreed reference, without using a ribbon.
const DeceasedCornerBadge = ({ size = 12 }) => (
    <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 bg-white/90 dark:bg-dark-card-bg/90 rounded-full p-0.5 sm:p-1 shadow">
        <RainbowIcon size={size} />
    </div>
);

// Replaces a card's plain "Deceased" status-bar text, matching that bar's original padding/
// text size exactly (size="sm" = AnimalList card, size="md" = PublicProfileView card).
const DeceasedBanner = ({ size = 'md' }) => {
    const isSm = size === 'sm';
    return (
        <div className={`w-full mt-auto bg-gray-800/90 dark:bg-black/80 text-center ${isSm ? 'py-0.5 sm:py-1' : 'py-1'}`}>
            <span className={`font-bold tracking-wide text-white uppercase ${isSm ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>Deceased</span>
        </div>
    );
};

export default DeceasedBanner;
export { RainbowIcon, DeceasedCornerBadge };
