import React from 'react';
import { NavLink } from 'react-router-dom';
import { PawPrint, LayoutGrid, Home, Baby } from 'lucide-react';

const NAV_ITEMS = [
    { to: '/animals', label: 'Animals', icon: PawPrint },
    { to: '/collections', label: 'Collections', icon: LayoutGrid },
    { to: '/enclosures', label: 'Enclosures', icon: Home },
    { to: '/breeding', label: 'Litters', icon: Baby },
];

const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-stretch z-30 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                        isActive ? 'text-accent' : 'text-gray-400'
                    }`
                }
            >
                <Icon size={20} />
                {label}
            </NavLink>
        ))}
    </nav>
);

export default BottomNav;
