import { useRef, useCallback } from 'react';
import TitleCard from './TitleCard';

function ShimmerCards({ count = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div className="shimmer-card" key={`shimmer-${i}`}>
      <div className="shimmer shimmer-image" />
      <div className="shimmer shimmer-text" />
    </div>
  ));
}

export default function TitleCarousel({ title, titles, loading, onTitleClick }) {
  const trackRef = useRef(null);

  const scroll = useCallback((direction) => {
    if (!trackRef.current) return;
    const scrollAmount = 600;
    trackRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          <span className="title-accent" />
          {title}
        </h2>
      </div>
      <div className="carousel-wrapper">
        <button
          className="carousel-btn left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <div className="carousel-track" ref={trackRef}>
          {loading ? (
            <ShimmerCards count={8} />
          ) : (
            titles?.map((t) => (
              <TitleCard key={t.id} title={t} onClick={onTitleClick} />
            ))
          )}
        </div>
        <button
          className="carousel-btn right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </div>
  );
}
