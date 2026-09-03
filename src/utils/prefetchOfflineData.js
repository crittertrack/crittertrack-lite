// Eagerly loads the core app datasets (and their photos) into the offline cache as soon as the
// user is authenticated, so pages have cached data ready even if the user never opened that
// tab yet while online — instead of only caching lazily whenever a page happens to be visited.
// apiClient's response interceptor already caches every successful GET body automatically (see
// apiClient.js), so this module just needs to trigger the requests; results are only inspected
// here to find photo URLs to warm into the image cache (see offlineImageCache.js).
import apiClient from './apiClient';
import { warmImageCache } from './offlineImageCache';

const PREFETCH_ENDPOINTS = [
    '/animals',
    '/enclosures',
    '/litters',
    '/supplies',
    '/users/general-tasks',
    '/collections',
    '/species',
    '/push/preferences',
];

const imageUrlsOf = (list) => (Array.isArray(list) ? list.map((item) => item.imageUrl || item.photoUrl).filter(Boolean) : []);

export const prefetchAppData = async () => {
    const settled = await Promise.allSettled(PREFETCH_ENDPOINTS.map((url) => apiClient.get(url)));
    const dataFor = (url) => {
        const result = settled[PREFETCH_ENDPOINTS.indexOf(url)];
        return result?.status === 'fulfilled' ? result.value.data : null;
    };
    const imageUrls = [...imageUrlsOf(dataFor('/animals')), ...imageUrlsOf(dataFor('/enclosures'))];
    imageUrls.forEach((url) => warmImageCache(url));
};
