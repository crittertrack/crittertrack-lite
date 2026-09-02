// Copied from crittertrack-frontend/src/utils/themeColors.js — keep in sync so Lite
// matches the main app's exact brand colors. Single source of truth for tailwind.config.js.
module.exports = {
  'page-bg': '#F1D1DC',
  'primary': '#9ED4E0',
  'primary-dark': '#7fd4e0',
  'accent': '#D27096',

  // dark-bg intentionally deviates from crittertrack-frontend's pure #000000 — Lite shows much
  // more bare page background (less covered by cards), so true black read as too harsh on device.
  'dark-bg': '#121212',
  'dark-card-bg': '#2A2830',
  'dark-surface': '#66666b',
  'dark-surface-hover': '#2D2B34',
  'dark-border': '#35343D',
  'dark-primary': '#7eaab3',
  'dark-primary-hover': '#6f949d',
  'dark-accent': '#8c5a6c',
  'dark-info-blue': '#4d648c',
  'dark-info-blue-hover': '#405577',
  'dark-text': '#EDEDF0',
  'dark-text-secondary': '#C4C3CA',
  'dark-text-muted': '#90909B',

  'accent-purple': '#7c3aed',
  'accent-purple-dark': '#6a1b9a',
  'dark-accent-purple': '#7c6aab',
  'dark-accent-purple-bg': '#332b4d',

  'pedigree-female-bg': '#fdeef6',
  'pedigree-male-bg': '#e8f1ff',
  'accent-purple-bg': '#f3e8ff',

  'info-indigo': '#6366f1',
  'info-blue': '#3b82f6',
  'info-blue-dark': '#1976d2',
  'info-bg': '#e3f2fd',

  'pedigree-neutral-bg': '#eef2f7',
  'success-green-dark': '#388e3c',
};
