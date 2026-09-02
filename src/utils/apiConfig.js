import { Capacitor } from '@capacitor/core';

// Copied from crittertrack-frontend/src/utils/apiConfig.js — Lite talks to the exact
// same backend so accounts/data stay fully compatible with the main app.
const NATIVE_API_ORIGIN = 'https://crittertrack-pedigree-production.up.railway.app';

export const API_BASE_URL = Capacitor.isNativePlatform() ? `${NATIVE_API_ORIGIN}/api` : '/api';
