import React from 'react';
import { Cat } from 'lucide-react';
import { warmImageCache, getCachedImageObjectUrl } from '../../utils/offlineImageCache';

// Copied from crittertrack-frontend/src/components/shared/AnimalImage.jsx, extended with an
// offline photo cache (see offlineImageCache.js): on load failure (e.g. no network), falls
// back to a locally-cached copy of the same image instead of just showing the placeholder icon.
const AnimalImage = ({ src, alt = 'Animal', className = 'w-full h-full object-cover', iconSize = 24, FallbackIcon = Cat }) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageSrc, setImageSrc] = React.useState(src);
    const objectUrlRef = React.useRef(null);

    React.useEffect(() => {
        setImageSrc(src);
        setImageError(false);
        if (src) warmImageCache(src);
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [src]);

    const handleError = async () => {
        const cachedUrl = src ? await getCachedImageObjectUrl(src) : null;
        if (cachedUrl) {
            objectUrlRef.current = cachedUrl;
            setImageSrc(cachedUrl);
        } else {
            setImageError(true);
        }
    };

    if (imageError || !imageSrc) {
        return (
            <div className={`${className} bg-gray-100 dark:bg-dark-card-bg flex items-center justify-center text-gray-400 dark:text-dark-text-muted`}>
                <FallbackIcon size={iconSize} />
            </div>
        );
    }
    return <img src={imageSrc} alt={alt} className={className} onError={handleError} loading="lazy" decoding="async" />;
};

export default AnimalImage;
