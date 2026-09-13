// Shared config for the iOS fundraiser, used by SupportTierBanner. Mirrors
// crittertrack-frontend/src/utils/iosFundraiser.js — keep in sync (same backend endpoint).
import { useState, useEffect } from 'react';
import apiClient from './apiClient';

export const MINI_SUPPORTER_URL = 'https://ko-fi.com/summary/7c3baac5-0a8b-4d13-bb94-148065db7506';
export const GENTLE_SUPPORTER_URL = 'https://ko-fi.com/summary/e1ecabb4-94c1-4ade-98f7-6e56339b1653';
export const DEDICATED_SUPPORTER_URL = 'https://ko-fi.com/summary/d534a92a-edb3-440d-8a0d-47f52ad71615';
export const MAJOR_SUPPORTER_URL = 'https://ko-fi.com/summary/e5616750-e310-4bc1-a69a-1024857d3560';

export const GOAL_MONTHLY_TOTAL = 50;

// Fetches the live pledged total from the backend (real Ko-fi + manually-tracked pledges).
// Returns null while loading.
export const useIosFundraiserTotal = () => {
    const [total, setTotal] = useState(null);
    useEffect(() => {
        let cancelled = false;
        apiClient.get('/kofi/ios-fundraiser')
            .then((res) => { if (!cancelled) setTotal(res.data?.total ?? 0); })
            .catch(() => { if (!cancelled) setTotal(0); });
        return () => { cancelled = true; };
    }, []);
    return total;
};

export const getIosFundraiserPercentage = (total) => Math.min(100, Math.round(((total || 0) / GOAL_MONTHLY_TOTAL) * 100));

// Ko-fi shows each visitor amounts in their own local currency/format — keep the real EUR
// figure but format it using the visitor's own locale conventions.
export const formatFundraiserAmount = (amount) => {
    try {
        return new Intl.NumberFormat(navigator.language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `€${amount}`;
    }
};

// Once pledges exceed the goal, celebrate the real total instead of just capping at "goal of goal".
export const getFundraiserStatusText = (total) => {
    const amount = total || 0;
    if (amount >= GOAL_MONTHLY_TOTAL) {
        return `🎉 Goal reached! ${formatFundraiserAmount(amount)} pledged in monthly support (goal was ${formatFundraiserAmount(GOAL_MONTHLY_TOTAL)})`;
    }
    return `${formatFundraiserAmount(amount)} of ${formatFundraiserAmount(GOAL_MONTHLY_TOTAL)} in monthly support pledged so far`;
};
