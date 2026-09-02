// Mirrors crittertrack-frontend's contexts/ThemeContext.jsx — same theme options,
// localStorage persistence, and system-preference resolution logic.
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Theme options: 'light', 'dark', 'auto'
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            return savedTheme;
        }
        return 'auto';
    });

    // Determine the actual theme to apply (resolves 'auto' to 'light' or 'dark')
    const [resolvedTheme, setResolvedTheme] = useState('light');

    // Detect system preference, and keep it live-updated while in 'auto' mode
    useEffect(() => {
        if (theme !== 'auto') {
            setResolvedTheme(theme);
            return;
        }
        if (!window.matchMedia) {
            setResolvedTheme('light');
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

        const handleChange = (e) => setResolvedTheme(e.matches ? 'dark' : 'light');
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, [theme]);

    // Apply theme class to document root
    useEffect(() => {
        const root = document.documentElement;
        if (resolvedTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [resolvedTheme]);

    // Save theme preference to localStorage
    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    const value = {
        theme,
        setTheme,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
