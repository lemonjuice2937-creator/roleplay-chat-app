"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LazyRefImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function LazyRefImage({ src, alt, className = '' }: LazyRefImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const node = imgRef.current;
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observerRef.current?.unobserve(node);
        }
      },
      { rootMargin: '100px' }
    );

    observerRef.current.observe(node);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imgElementRef.current) {
        imgElementRef.current.onload = null;
        imgElementRef.current.onerror = null;
        imgElementRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-navy-800 animate-pulse rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-navy-800 via-navy-700 to-navy-800 animate-shimmer" />
        </div>
      )}

      {isVisible && !hasError && (
        <img
          ref={(el) => {
            imgElementRef.current = el;
          }}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-800">
          <span className="text-white/40 text-sm">Erro ao carregar</span>
        </div>
      )}
    </div>
  );
}
