import React from 'react';

// Mirrors crittertrack-frontend/src/utils/richText.jsx — keep in sync.
// Inline pattern: **bold**, *italic* or _italic_ (single-level only, no nesting/escaping).
const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g;

function renderInline(line, keyPrefix) {
    const parts = line.split(INLINE_PATTERN).filter(part => part !== '');
    return parts.map((part, i) => {
        const key = `${keyPrefix}-${i}`;
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={key}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={key}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('_') && part.endsWith('_')) {
            return <em key={key}>{part.slice(1, -1)}</em>;
        }
        return part;
    });
}

/**
 * Renders admin-authored broadcast/announcement text as React nodes (no dangerouslySetInnerHTML):
 * preserves line breaks and supports **bold** and *italic* (or _italic_) inline markers.
 */
export function renderRichText(text) {
    if (!text) return null;
    return String(text).split('\n').map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
            {lineIdx > 0 && <br />}
            {renderInline(line, lineIdx)}
        </React.Fragment>
    ));
}
