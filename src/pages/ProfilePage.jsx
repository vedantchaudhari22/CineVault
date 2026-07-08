import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TitleCard from '../components/TitleCard';
import TitleDetailModal from '../components/TitleDetailModal';
import { getWatchHistory, getWatchlist } from '../services/userDataService';

export default function ProfilePage() {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const watchHistory = useMemo(() => {
    if (!user) return [];
    return getWatchHistory(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  const watchlist = useMemo(() => {
    if (!user) return [];
    return getWatchlist(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  const handleSignOut = useCallback(async () => {
    try {
      await logOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, [logOut, navigate]);

  const handleTitleClick = useCallback((title) => {
    setSelectedTitle(title);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedTitle(null);
    setRefreshKey(prev => prev + 1);
  }, []);

  const getInitials = () => {
    if (!user) return '?';
    const name = user.displayName || user.email || '';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.charAt(0).toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="profile-page" id="profile-page">
      <motion.div
        className="profile-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="profile-avatar">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
          ) : (
            getInitials()
          )}
        </div>

        <div className="profile-info">
          <h1>{user.displayName || 'User'}</h1>
          <p>{user.email}</p>
        </div>

        <div className="profile-actions">
          <button
            className="btn-signout"
            onClick={handleSignOut}
            id="signout-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </motion.div>

      {/* Watchlist */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="profile-section-title">
          📋 My Watchlist
          <span className="count-badge">{watchlist.length}</span>
        </h2>
        {watchlist.length > 0 ? (
          <div className="profile-grid">
            {watchlist.map((title) => (
              <TitleCard key={title.id} title={title} onClick={handleTitleClick} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <p>Your watchlist is empty. Start adding movies & shows!</p>
          </div>
        )}
      </motion.div>

      {/* Watch History */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="profile-section-title">
          🕒 Watch History
          <span className="count-badge">{watchHistory.length}</span>
        </h2>
        {watchHistory.length > 0 ? (
          <div className="profile-grid">
            {watchHistory.map((title) => (
              <TitleCard key={title.id} title={title} onClick={handleTitleClick} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <p>No watch history yet. Start exploring!</p>
          </div>
        )}
      </motion.div>

      <TitleDetailModal
        title={selectedTitle}
        onClose={handleModalClose}
      />
    </div>
  );
}
