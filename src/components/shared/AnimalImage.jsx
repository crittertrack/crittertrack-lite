import React from 'react';
import { Cat } from 'lucide-react';

// Copied from crittertrack-frontend/src/components/shared/AnimalImage.jsx
const AnimalImage = ({ src, alt = 'Animal', className = 'w-full h-full object-cover', iconSize = 24 }) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageSrc, setImageSrc] = React.useState(src);

    React.useEffect(() => { setImageSrc(src); setImageError(false); }, [src]);

    if (imageError || !imageSrc) {
        return (
            <div className={`${className} bg-gray-100 dark:bg-dark-card-bg flex items-center justify-center text-gray-400 dark:text-dark-text-muted`}>
                <Cat size={iconSize} />
            </div>
        );
    }
    return <img src={imageSrc} alt={alt} className={className} onError={() => setImageError(true)} />;
};

export default AnimalImage;
