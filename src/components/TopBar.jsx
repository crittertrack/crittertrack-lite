import React from 'react';
import { ArrowLeft } from 'lucide-react';

// Shared compact top bar used across all Lite screens. Pages rendered below the app-wide
// BrandHeader already have safe-area-top reserved there, so they pass safeAreaTop={false}.
const TopBar = ({ title, onBack, right, safeAreaTop = true }) => (
    <header
        className="sticky top-0 z-20 bg-gradient-to-r from-accent to-primary text-white px-4 pb-3 flex items-center gap-3 shadow-sm"
        style={{ paddingTop: safeAreaTop ? 'calc(0.75rem + env(safe-area-inset-top))' : '0.75rem' }}
    >
        {onBack && (
            <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/20 transition">
                <ArrowLeft size={20} />
            </button>
        )}
        <h1 className="text-lg font-bold flex-1 truncate">{title}</h1>
        {right}
    </header>
);

export default TopBar;
