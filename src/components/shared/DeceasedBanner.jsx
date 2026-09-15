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

// Simple filled black ribbon/medallion badge for the photo corner.
const RibbonIcon = ({ className = 'w-8 h-8' }) => (
    <svg viewBox="0 0 24 24" fill="black" className={className}>
        <path d="M8 12 L3.5 21 L11 17.5 Z" />
        <path d="M16 12 L20.5 21 L13 17.5 Z" />
        <circle cx="12" cy="8.5" r="6.5" />
    </svg>
);

// Straddles the photo's bottom-right corner -- the badge's own center sits exactly on the
// corner point, so it partially overlaps the image and partially hangs off it.
const DeceasedCornerBadge = ({ iconClassName = 'w-8 h-8' }) => (
    <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2">
        <RibbonIcon className={iconClassName} />
    </div>
);

// Replaces a card's plain "Deceased" status-bar text, matching that bar's original padding/
// font/text size exactly (size="sm" = AnimalList card, size="md" = PublicProfileView card).
const DeceasedBanner = ({ size = 'md' }) => {
    const isSm = size === 'sm';
    return (
        <div className={`w-full mt-auto bg-gray-800/90 dark:bg-black/80 text-center border-t border-gray-700 dark:border-black/60 ${isSm ? 'py-0.5 sm:py-1' : 'py-1'}`}>
            <div className={`font-medium capitalize text-white ${isSm ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>Deceased</div>
        </div>
    );
};

export default DeceasedBanner;
export { RainbowIcon, RibbonIcon, DeceasedCornerBadge };
