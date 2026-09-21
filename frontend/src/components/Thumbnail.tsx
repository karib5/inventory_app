import React from 'react';
import { Package } from 'lucide-react';
import { resolveImageUrl } from '../api';

export default function Thumbnail({
  src,
  alt,
  size = 'md',
  icon,
}: {
  src: string | null;
  alt: string;
  size?: 'md' | 'lg';
  icon?: React.ReactNode;
}) {
  const className = size === 'lg' ? 'thumb-lg' : 'thumb';
  const resolved = resolveImageUrl(src);
  if (resolved) {
    return <img src={resolved} alt={alt} className={className} />;
  }
  return (
    <div className={`${className} thumb-placeholder`}>
      {icon ?? <Package size={size === 'lg' ? 32 : 18} />}
    </div>
  );
}
