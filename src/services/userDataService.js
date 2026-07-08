const STORAGE_PREFIX = 'binaire_cine_';

function getKey(uid, type) {
  return `${STORAGE_PREFIX}${uid}_${type}`;
}

function getStoredData(uid, type) {
  try {
    const raw = localStorage.getItem(getKey(uid, type));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredData(uid, type, data) {
  try {
    localStorage.setItem(getKey(uid, type), JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

// ===== Watch History =====

export function getWatchHistory(uid) {
  return getStoredData(uid, 'history');
}

export function addToWatchHistory(uid, title) {
  const history = getStoredData(uid, 'history');
  // Remove if already exists (move to top)
  const filtered = history.filter(item => item.id !== title.id);
  const entry = {
    id: title.id,
    primaryTitle: title.primaryTitle,
    primaryImage: title.primaryImage,
    startYear: title.startYear,
    rating: title.rating,
    type: title.type,
    genres: title.genres,
    watchedAt: Date.now(),
  };
  filtered.unshift(entry);
  // Keep only last 100
  setStoredData(uid, 'history', filtered.slice(0, 100));
}

// ===== Watchlist =====

export function getWatchlist(uid) {
  return getStoredData(uid, 'watchlist');
}

export function addToWatchlist(uid, title) {
  const watchlist = getStoredData(uid, 'watchlist');
  if (watchlist.some(item => item.id === title.id)) return;
  const entry = {
    id: title.id,
    primaryTitle: title.primaryTitle,
    primaryImage: title.primaryImage,
    startYear: title.startYear,
    rating: title.rating,
    type: title.type,
    genres: title.genres,
    addedAt: Date.now(),
  };
  watchlist.unshift(entry);
  setStoredData(uid, 'watchlist', watchlist);
}

export function removeFromWatchlist(uid, titleId) {
  const watchlist = getStoredData(uid, 'watchlist');
  const filtered = watchlist.filter(item => item.id !== titleId);
  setStoredData(uid, 'watchlist', filtered);
}

export function isInWatchlist(uid, titleId) {
  const watchlist = getStoredData(uid, 'watchlist');
  return watchlist.some(item => item.id === titleId);
}
