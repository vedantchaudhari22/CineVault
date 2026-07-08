import { cacheGet, cacheSet } from './cacheService';
import { MOCK_TITLES } from './mockData';

const BASE_URL = 'https://api.imdbapi.dev';

// Rate limiter: ensures minimum delay between live API requests
let lastRequestTime = 0;
const MIN_DELAY = 500; // ms between requests

async function rateLimitedFetch(url, signal) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY) {
    await new Promise((r) => setTimeout(r, MIN_DELAY - elapsed));
  }
  lastRequestTime = Date.now();
  const response = await fetch(url, { signal });
  return response;
}

async function fetchWithRetry(url, signal, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await rateLimitedFetch(url, signal);
      if (response.status === 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

// Fallback logic for mock database queries when the live API is down/rate-limited
function queryMockData(params = {}, isSearch = false, query = '') {
  let list = [...MOCK_TITLES];

  if (isSearch && query) {
    const q = query.toLowerCase().trim();
    list = list.filter((t) => {
      const matchId = t.id.toLowerCase().includes(q);
      const matchTitle = t.primaryTitle.toLowerCase().includes(q);
      const matchYear = String(t.startYear).includes(q);
      return matchId || matchTitle || matchYear;
    });
    return { titles: list.slice(0, params.limit || 20) };
  }

  // Filter by types
  if (params.types && params.types.length > 0) {
    const typeSet = new Set(params.types.map(t => t.toLowerCase()));
    list = list.filter((t) => {
      const typeNormalized = t.type === 'tvSeries' ? 'tv_series' : t.type.toLowerCase();
      return typeSet.has(typeNormalized) || typeSet.has(t.type.toLowerCase());
    });
  }

  // Filter by genres
  if (params.genres && params.genres.length > 0) {
    const genreSet = new Set(params.genres.map(g => g.toLowerCase()));
    list = list.filter((t) =>
      t.genres && t.genres.some(g => genreSet.has(g.toLowerCase()))
    );
  }

  // Sort
  if (params.sortBy) {
    list.sort((a, b) => {
      let valA = 0, valB = 0;
      if (params.sortBy === 'SORT_BY_POPULARITY' || params.sortBy === 'SORT_BY_USER_RATING_COUNT') {
        valA = a.rating?.voteCount || 0;
        valB = b.rating?.voteCount || 0;
      } else if (params.sortBy === 'SORT_BY_USER_RATING') {
        valA = a.rating?.aggregateRating || 0;
        valB = b.rating?.aggregateRating || 0;
      } else if (params.sortBy === 'SORT_BY_YEAR' || params.sortBy === 'SORT_BY_RELEASE_DATE') {
        valA = a.startYear || 0;
        valB = b.startYear || 0;
      }
      return params.sortOrder === 'DESC' ? valB - valA : valA - valB;
    });
  }

  // Simple paging mock
  const page = params.pageToken ? parseInt(params.pageToken, 10) || 0 : 0;
  const pageSize = 12;
  const start = page * pageSize;
  const pageItems = list.slice(start, start + pageSize);
  const nextPageToken = start + pageSize < list.length ? String(page + 1) : null;

  return {
    titles: pageItems,
    nextPageToken,
    totalCount: list.length,
  };
}

async function fetchWithCache(url, cacheKey, options = {}) {
  const { signal, skipCache = false, fallbackParams = {}, isSearch = false, searchQuery = '' } = options;

  // Try cache first
  if (!skipCache) {
    const cached = await cacheGet(cacheKey);
    if (cached && !cached.stale) {
      return cached.data;
    }
    // If offline and have stale data, use it
    if (cached && cached.stale && !navigator.onLine) {
      return cached.data;
    }
  }

  // Fetch from network
  try {
    const data = await fetchWithRetry(url, signal);
    await cacheSet(cacheKey, data);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    // Try cache fallback first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Failover: return local mock data structured identically so UI works seamlessly!
    console.warn(`Live API request failed, falling back to local database for key: ${cacheKey}`);
    const localResult = queryMockData(fallbackParams, isSearch, searchQuery);
    return localResult;
  }
}

/**
 * List titles with optional filters and pagination
 */
export async function listTitles(params = {}, signal) {
  const queryParams = new URLSearchParams();

  if (params.types) {
    params.types.forEach(t => queryParams.append('types', t));
  }
  if (params.genres) {
    params.genres.forEach(g => queryParams.append('genres', g));
  }
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params.pageToken) queryParams.set('pageToken', params.pageToken);
  if (params.startYear) queryParams.set('startYear', params.startYear);
  if (params.endYear) queryParams.set('endYear', params.endYear);
  if (params.minAggregateRating) queryParams.set('minAggregateRating', params.minAggregateRating);
  if (params.minVoteCount) queryParams.set('minVoteCount', params.minVoteCount);

  const qs = queryParams.toString();
  const url = `${BASE_URL}/titles${qs ? '?' + qs : ''}`;
  const cacheKey = `titles_${qs}`;

  return fetchWithCache(url, cacheKey, {
    signal,
    fallbackParams: params
  });
}

/**
 * Get a single title by IMDb ID
 */
export async function getTitle(titleId, signal) {
  const url = `${BASE_URL}/titles/${titleId}`;
  const cacheKey = `title_${titleId}`;
  
  // Find in local mock list if it fails or doesn't exist
  try {
    return await fetchWithCache(url, cacheKey, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    const found = MOCK_TITLES.find(t => t.id === titleId);
    if (found) return found;
    throw error;
  }
}

/**
 * Search titles by query string
 */
export async function searchTitles(query, limit = 20, signal) {
  const queryParams = new URLSearchParams({ query, limit: String(limit) });
  const url = `${BASE_URL}/search/titles?${queryParams.toString()}`;
  const cacheKey = `search_${query}_${limit}`;

  return fetchWithCache(url, cacheKey, {
    signal,
    isSearch: true,
    searchQuery: query,
    fallbackParams: { limit }
  });
}

/**
 * List titles sorted by popularity (for "Today's Top Shows")
 */
export async function getTopShows(signal) {
  return listTitles({
    sortBy: 'SORT_BY_POPULARITY',
    sortOrder: 'ASC',
    minVoteCount: 10000,
  }, signal);
}

/**
 * List titles filtered by genre
 */
export async function getTitlesByGenre(genre, signal) {
  return listTitles({
    genres: [genre],
    sortBy: 'SORT_BY_POPULARITY',
    sortOrder: 'ASC',
    minVoteCount: 5000,
  }, signal);
}

/**
 * List TV series specifically
 */
export async function getTVSeries(pageToken, signal) {
  return listTitles({
    types: ['TV_SERIES'],
    sortBy: 'SORT_BY_POPULARITY',
    sortOrder: 'ASC',
    pageToken,
  }, signal);
}

/**
 * List movies specifically
 */
export async function getMovies(pageToken, signal) {
  return listTitles({
    types: ['MOVIE'],
    sortBy: 'SORT_BY_POPULARITY',
    sortOrder: 'ASC',
    pageToken,
  }, signal);
}

/**
 * Get title images
 */
export async function getTitleImages(titleId, signal) {
  const url = `${BASE_URL}/titles/${titleId}/images`;
  const cacheKey = `title_images_${titleId}`;
  try {
    return await fetchWithCache(url, cacheKey, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return { images: [] };
  }
}

/**
 * Get title credits
 */
export async function getTitleCredits(titleId, signal) {
  const url = `${BASE_URL}/titles/${titleId}/credits`;
  const cacheKey = `title_credits_${titleId}`;
  try {
    return await fetchWithCache(url, cacheKey, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return { credits: [] };
  }
}

// Genre list for the UI
export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy',
  'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'
];
