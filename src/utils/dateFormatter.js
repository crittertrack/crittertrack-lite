import { differenceInDays } from 'date-fns';
/**
 * Date formatting utility for consistent date display across the application.
 * Copied from crittertrack-frontend/src/utils/dateFormatter.js — keep in sync.
 */

export const parseLocalDate = (date) => {
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
        const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
        }
        const isoMidnightMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00/);
        if (isoMidnightMatch) {
            return new Date(Number(isoMidnightMatch[1]), Number(isoMidnightMatch[2]) - 1, Number(isoMidnightMatch[3]));
        }
    }
    return new Date(date);
};

export const isStatusPeriodActive = (details) => {
    if (!details || !details.status || details.status === 'None') return false;
    if (!details.startDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseLocalDate(details.startDate);
    if (start > today) return false;
    if (details.endDate) {
        const end = parseLocalDate(details.endDate);
        if (end < today) return false;
    }
    return true;
};

export const formatDate = (date) => {
    if (!date) return '';
    const d = parseLocalDate(date);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
};

export const formatDateShort = (date) => {
    if (!date) return '';
    const d = parseLocalDate(date);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(d);
};

export const formatLocalDate = (date) => {
    if (!date) return '—';
    const dateObj = parseLocalDate(date);
    return !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : '—';
};

export const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    if (isNaN(then.getTime())) return '';
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMo = Math.floor(diffDays / 30);
    if (diffMo < 12) return `${diffMo}mo ago`;
    return `${Math.floor(diffMo / 12)}y ago`;
};

export const calculateBreedingAge = (birthDate, endDate) => {
    if (!birthDate) return '—';
    const start = new Date(birthDate);
    const end = endDate ? new Date(endDate) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—';
    const totalDays = Math.abs(differenceInDays(end, start));
    const daysInBreedingMonth = 28;
    const daysInBreedingYear = 365;
    const years = Math.floor(totalDays / daysInBreedingYear);
    const remainingDaysAfterYears = totalDays % daysInBreedingYear;
    const months = Math.floor(remainingDaysAfterYears / daysInBreedingMonth);
    const remainingDays = remainingDaysAfterYears % daysInBreedingMonth;
    if (years > 0) return `${years}y ${months}m`;
    if (months > 0) return `${months}m ${remainingDays}d`;
    return `${remainingDays}d`;
};

export const litterAge = calculateBreedingAge;

export const formatAnimalAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years < 0) return null;
    const ageLabel = years > 0 ? `${years}y ${months}m` : `${months}m`;
    return { years, months, label: ageLabel };
};

export const calculateAgeDetailed = (birthDate) => {
    if (!birthDate) return null;
    const born = new Date(birthDate);
    const now = new Date();
    if (isNaN(born.getTime()) || born > now) return null;
    let years = now.getFullYear() - born.getFullYear();
    let months = now.getMonth() - born.getMonth();
    let days = now.getDate() - born.getDate();
    if (days < 0) {
        months--;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years}y ${months}m ${days}d`;
    if (months > 0) return `${months}m ${days}d`;
    return `${days}d`;
};
