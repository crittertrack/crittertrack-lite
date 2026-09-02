import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Mirrors crittertrack-frontend's components/ThemeToggle/index.jsx logic (cycle-through
// dropdown of Light/Dark/Auto), styled to match Lite's BrandHeader icon buttons.
const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'auto', label: 'Auto', icon: Monitor },
    ];
    const CurrentIcon = themeOptions.find((opt) => opt.value === theme)?.icon || Monitor;

    return (
        <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen((p) => !p)}
                className="p-2 rounded-full bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-muted"
                title="Change theme"
            >
                <CurrentIcon size={18} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-dark-card-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-lg z-50 overflow-hidden">
                    {themeOptions.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            onClick={() => { setTheme(value); setIsOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition ${
                                theme === value
                                    ? 'bg-accent/10 text-accent font-semibold'
                                    : 'text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface-hover'
                            }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThemeToggle;
