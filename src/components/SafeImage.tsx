import React, { useState } from 'react';
import { Camera } from 'lucide-react';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-48 object-cover',
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 p-4 ${className}`}
      >
        <Camera className="w-6 h-6 mb-1.5 text-slate-400" />
        <span className="text-xs font-medium text-center line-clamp-2">
          {fallbackLabel || alt || 'Municipal Evidence Record'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
