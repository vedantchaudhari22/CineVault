import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { addToWatchlist, removeFromWatchlist, isInWatchlist, addToWatchHistory } from '../services/userDataService';

export default function TitleDetailModal({ title, onClose }) {
  const { user } = useAuth();
  const inWatchlist = user && title ? isInWatchlist(user.uid, title.id) : false;

  useEffect(() => {
    if (title) {
      document.body.style.overflow = 'hidden';
      // Add to watch history when viewed
      if (user) {
        addToWatchHistory(user.uid, title);
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [title, user]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleWatchlistToggle = useCallback(() => {
    if (!user || !title) return;
    if (inWatchlist) {
      removeFromWatchlist(user.uid, title.id);
    } else {
      addToWatchlist(user.uid, title);
    }
    // Force re-render by closing and reopening would be complex;
    // Instead, we'll use a simple approach
    onClose();
  }, [user, title, inWatchlist, onClose]);

  const imageUrl = title?.primaryImage?.url;
  const rating = title?.rating?.aggregateRating;
  const runtime = title?.runtimeSeconds
    ? `${Math.floor(title.runtimeSeconds / 60)}h ${title.runtimeSeconds % 60}m`
    : null;

  return (
    <AnimatePresence>
      {title && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-hero"
              style={{
                backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                backgroundColor: imageUrl ? undefined : '#1a1a2e',
              }}
            >
              <div className="modal-hero-gradient" />
            </div>

            <button className="modal-close" onClick={onClose} aria-label="Close" id="modal-close-btn">
              ✕
            </button>

            <div className="modal-body">
              <h2 className="modal-title">{title.primaryTitle}</h2>

              <div className="modal-meta">
                {rating && (
                  <span className="modal-meta-item rating">
                    ★ {rating.toFixed(1)} ({title.rating?.voteCount?.toLocaleString()} votes)
                  </span>
                )}
                {title.startYear && (
                  <span className="modal-meta-item">{title.startYear}</span>
                )}
                {runtime && (
                  <span className="modal-meta-item">{runtime}</span>
                )}
                {title.type && (
                  <span className="modal-meta-item" style={{ textTransform: 'capitalize' }}>
                    {title.type.replace(/_/g, ' ').toLowerCase()}
                  </span>
                )}
              </div>

              {title.genres && title.genres.length > 0 && (
                <div className="modal-genres">
                  {title.genres.map((genre) => (
                    <span key={genre} className="modal-genre-tag">{genre}</span>
                  ))}
                </div>
              )}

              {title.plot && (
                <p className="modal-plot">{title.plot}</p>
              )}

              <div className="modal-actions">
                <button
                  className={`btn-modal watchlist ${inWatchlist ? 'added' : ''}`}
                  onClick={handleWatchlistToggle}
                  id="watchlist-toggle-btn"
                >
                  {inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
                </button>
                <button className="btn-modal watched" id="mark-watched-btn">
                  👁 Mark as Watched
                </button>
              </div>

              <div className="modal-credits">
                {title.directors && title.directors.length > 0 && (
                  <div className="modal-credit-group">
                    <h4>Directors</h4>
                    <p>{title.directors.map(d => d.displayName).join(', ')}</p>
                  </div>
                )}
                {title.writers && title.writers.length > 0 && (
                  <div className="modal-credit-group">
                    <h4>Writers</h4>
                    <p>{title.writers.map(w => w.displayName).join(', ')}</p>
                  </div>
                )}
                {title.stars && title.stars.length > 0 && (
                  <div className="modal-credit-group">
                    <h4>Stars</h4>
                    <p>{title.stars.map(s => s.displayName).join(', ')}</p>
                  </div>
                )}
                {title.originCountries && title.originCountries.length > 0 && (
                  <div className="modal-credit-group">
                    <h4>Countries</h4>
                    <p>{title.originCountries.map(c => c.name).join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
