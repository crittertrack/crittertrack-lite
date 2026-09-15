import React from 'react';

// Hand-drawn rainbow (not lucide's single-tone icon) so each arc gets its own hue -- a
// "Rainbow Bridge" memorial motif, deliberately not a ribbon, to avoid resembling SimpleBreed's.
const RainbowIcon = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 17a10 10 0 0 0-20 0" stroke="#f87171" />
        <path d="M6 17a6 6 0 0 1 12 0" stroke="#facc15" />
        <path d="M10 17a2 2 0 0 1 4 0" stroke="#60a5fa" />
    </svg>
);

// Fills the photo's bottom-right quadrant (half its width/height = 1/4 its area) so the
// rainbow sits directly on the image, not floating beside it. `iconClassName` sizes the icon
// to match the parent photo box's own responsive dimensions.
const DeceasedCornerBadge = ({ iconClassName = 'w-6 h-6' }) => (
    <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-white/90 dark:bg-dark-card-bg/90 rounded-br-md flex items-center justify-center">
        <RainbowIcon className={iconClassName} />
    </div>
);

// Replaces a card's plain "Deceased" status-bar text, matching that bar's original padding/
// font/text size exactly (size="sm" = AnimalList card, size="md" = PublicProfileView card).
const DeceasedBanner = ({ size = 'md' }) => {
    const isSm = size === 'sm';
    return (
        <div className={`w-full mt-auto bg-gray-800/90 dark:bg-black/80 text-center border-t border-gray-700 dark:border-black/60 ${isSm ? 'py-0.5 sm:py-1' : 'py-1'}`}>
            <span className={`font-medium capitalize text-white ${isSm ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>Deceased</span>
        </div>
    );
};

export default DeceasedBanner;
export { RainbowIcon, DeceasedCornerBadge };
