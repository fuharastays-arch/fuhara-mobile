'use client';
import { useEffect, useRef, useState } from 'react';
import { safeImageUrl } from '@fuhara/core/catalog';
export function PropertyImage({
  src,
  alt,
  eager = false,
}: {
  src: string | null;
  alt: string;
  eager?: boolean;
}) {
  const url = safeImageUrl(src);
  return (
    <LoadedPropertyImage
      key={url ?? 'missing'}
      url={url}
      alt={alt}
      eager={eager}
    />
  );
}
function LoadedPropertyImage({
  url,
  alt,
  eager,
}: {
  url: string | null;
  alt: string;
  eager: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // A failed eager image can finish before React attaches its error listener.
    if (img.current?.complete && img.current.naturalWidth === 0)
      setFailed(true);
  }, []);
  return url && !failed ? (
    <img
      ref={img}
      className="property-image"
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className="image-placeholder"
      role="img"
      aria-label="Property photo unavailable"
    >
      <span aria-hidden="true">⌂</span>
      <small>Photo unavailable</small>
    </div>
  );
}
