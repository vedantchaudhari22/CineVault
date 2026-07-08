import { memo, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

const TitleCard = memo(function TitleCard({ title, onClick }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px',
  });

  const imageUrl = title.primaryImage?.url;
  const rating = title.rating?.aggregateRating;
  const year = title.startYear;

  const handleClick = useCallback(() => {
    if (onClick) onClick(title);
  }, [title, onClick]);

  return (
    <div className="title-card" ref={ref} onClick={handleClick} id={`title-${title.id}`}>
      <div className="title-card-image">
        {inView && imageUrl ? (
          <>
            {!imageLoaded && <div className="placeholder shimmer" style={{ position: 'absolute', inset: 0 }} />}
            <img
              src={imageUrl}
              alt={title.primaryTitle}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <div className="placeholder">
            <span>🎬</span>
          </div>
        )}
        <div className="title-card-overlay">
          <div className="card-title">{title.primaryTitle}</div>
          <div className="card-meta">
            {rating && (
              <span className="card-rating">
                ★ {rating.toFixed(1)}
              </span>
            )}
            {year && <span>{year}</span>}
            {title.type && <span>{title.type.replace(/_/g, ' ')}</span>}
          </div>
        </div>
      </div>
      <div className="title-card-info">
        <div className="card-name">{title.primaryTitle}</div>
      </div>
    </div>
  );
});

export default TitleCard;
