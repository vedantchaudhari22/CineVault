import { motion } from 'framer-motion';

export default function HeroBanner({ title, onWatchlistClick, isInWatchlist }) {
  if (!title) return null;

  const imageUrl = title.primaryImage?.url;
  const rating = title.rating?.aggregateRating;
  const runtime = title.runtimeSeconds
    ? `${Math.floor(title.runtimeSeconds / 60)}h ${title.runtimeSeconds % 60}m`
    : null;

  return (
    <div className="hero-banner" id="hero-banner">
      <div
        className="hero-backdrop"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundColor: imageUrl ? undefined : '#1a1a2e',
        }}
      />
      <div className="hero-bottom-fade" />

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hero-badge">
          🔥 Today's Top Pick
        </div>

        <h1 className="hero-title">{title.primaryTitle}</h1>

        <div className="hero-meta">
          {rating && (
            <span className="hero-rating">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {rating.toFixed(1)}
            </span>
          )}
          {title.startYear && <span>{title.startYear}</span>}
          {runtime && <span>{runtime}</span>}
          {title.type && (
            <span style={{ textTransform: 'capitalize' }}>
              {title.type.replace(/_/g, ' ').toLowerCase()}
            </span>
          )}
        </div>

        {title.genres && title.genres.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {title.genres.slice(0, 4).map((genre) => (
              <span key={genre} className="hero-genre-tag">{genre}</span>
            ))}
          </div>
        )}

        {title.plot && (
          <p className="hero-plot">{title.plot}</p>
        )}

        <div className="hero-actions">
          <button
            className="btn-hero primary"
            onClick={() => onWatchlistClick?.(title)}
          >
            {isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
          </button>
          <button className="btn-hero secondary">
            ℹ More Info
          </button>
        </div>
      </motion.div>
    </div>
  );
}
