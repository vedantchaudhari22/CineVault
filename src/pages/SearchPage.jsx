import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import TitleCard from '../components/TitleCard';
import TitleDetailModal from '../components/TitleDetailModal';
import { searchTitles } from '../services/api';
import { cacheGetAll } from '../services/cacheService';

/**
 * Hash-map implementation for O(1) autocomplete lookups.
 * 
 * Structure:
 *   byId:   { titleId -> titleObject }
 *   byName: { lowercaseToken -> Set<titleId> }
 *   byYear: { yearString -> Set<titleId> }
 *
 * Lookups by ID are O(1). Name/year lookups iterate matching keys
 * but the hash-map avoids scanning the entire dataset.
 */
function buildSearchIndex(titles) {
  const byId = new Map();
  const byName = new Map();
  const byYear = new Map();

  titles.forEach((title) => {
    if (!title.id) return;

    // Index by ID
    byId.set(title.id.toLowerCase(), title);

    // Index by name tokens
    const name = (title.primaryTitle || '').toLowerCase();
    const tokens = name.split(/\s+/).filter(Boolean);
    // Also add the full name as a key
    tokens.push(name);
    tokens.forEach((token) => {
      if (!byName.has(token)) byName.set(token, new Set());
      byName.get(token).add(title.id);
    });

    // Index by year
    if (title.startYear) {
      const yearStr = String(title.startYear);
      if (!byYear.has(yearStr)) byYear.set(yearStr, new Set());
      byYear.get(yearStr).add(title.id);
    }
  });

  return { byId, byName, byYear };
}

function searchHashMap(index, query, filterType = 'all') {
  if (!index || !query) return [];
  const q = query.toLowerCase().trim();
  const results = new Set();

  // Search by ID
  if (filterType === 'all' || filterType === 'id') {
    if (index.byId.has(q)) {
      results.add(index.byId.get(q).id);
    }
    // Also partial ID match (e.g., "tt12345")
    for (const [id] of index.byId) {
      if (id.includes(q)) results.add(index.byId.get(id).id);
      if (results.size >= 20) break;
    }
  }

  // Search by name
  if (filterType === 'all' || filterType === 'name') {
    for (const [token, ids] of index.byName) {
      if (token.startsWith(q) || token.includes(q)) {
        ids.forEach((id) => results.add(id));
      }
      if (results.size >= 30) break;
    }
  }

  // Search by year
  if (filterType === 'all' || filterType === 'year') {
    if (index.byYear.has(q)) {
      index.byYear.get(q).forEach((id) => results.add(id));
    }
  }

  // Convert IDs to title objects
  return Array.from(results)
    .map((id) => index.byId.get(id.toLowerCase()))
    .filter(Boolean)
    .slice(0, 50);
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [autocomplete, setAutocomplete] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState(null);

  // Hash-map index
  const [searchIndex, setSearchIndex] = useState(null);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const acRef = useRef(null);

  // Build search index from cached data
  useEffect(() => {
    async function buildIndex() {
      const allCached = await cacheGetAll();
      const allTitles = [];

      allCached.forEach((entry) => {
        if (entry.data?.titles && Array.isArray(entry.data.titles)) {
          entry.data.titles.forEach((t) => {
            if (t.id && t.primaryTitle) allTitles.push(t);
          });
        }
      });

      if (allTitles.length > 0) {
        setSearchIndex(buildSearchIndex(allTitles));
      }
    }
    buildIndex();
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (!query.trim()) {
      setAutocomplete([]);
      setShowAutocomplete(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // First try hash-map for instant results
      if (searchIndex) {
        const localResults = searchHashMap(searchIndex, query, filterType);
        if (localResults.length > 0) {
          setAutocomplete(localResults.slice(0, 8));
          setShowAutocomplete(true);
          return;
        }
      }

      // Fallback to API search
      const controller = new AbortController();
      searchTitles(query, 8, controller.signal)
        .then((data) => {
          setAutocomplete(data.titles || []);
          setShowAutocomplete(true);
        })
        .catch(() => {});
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchIndex, filterType]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (acRef.current && !acRef.current.contains(e.target)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setShowAutocomplete(false);
    setLoading(true);
    setSearched(true);

    // Try hash-map first
    if (searchIndex) {
      const localResults = searchHashMap(searchIndex, query, filterType);
      if (localResults.length > 0) {
        setResults(localResults);
        setLoading(false);
        return;
      }
    }

    // Fallback to API
    try {
      const data = await searchTitles(query, 50);
      setResults(data.titles || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, searchIndex, filterType]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleAutocompleteSelect = useCallback((title) => {
    setSelectedTitle(title);
    setShowAutocomplete(false);
  }, []);

  const handleTitleClick = useCallback((title) => {
    setSelectedTitle(title);
  }, []);

  const filters = useMemo(() => [
    { key: 'all', label: 'All' },
    { key: 'name', label: 'By Name' },
    { key: 'id', label: 'By ID' },
    { key: 'year', label: 'By Year' },
  ], []);

  return (
    <div className="search-page" id="search-page">
      <motion.div
        className="search-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Discover Movies & Shows</h1>

        <div className="search-input-wrapper" ref={acRef}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by title, ID (tt1234567), or year..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => autocomplete.length > 0 && setShowAutocomplete(true)}
            id="search-input"
          />

          {/* Autocomplete Dropdown */}
          {showAutocomplete && autocomplete.length > 0 && (
            <motion.div
              className="autocomplete-dropdown"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {autocomplete.map((title) => (
                <div
                  key={title.id}
                  className="autocomplete-item"
                  onClick={() => handleAutocompleteSelect(title)}
                >
                  {title.primaryImage?.url ? (
                    <img src={title.primaryImage.url} alt="" loading="lazy" />
                  ) : (
                    <div style={{
                      width: 40, height: 56, borderRadius: 6,
                      background: 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>🎬</div>
                  )}
                  <div className="ac-info">
                    <div className="ac-title">{title.primaryTitle}</div>
                    <div className="ac-meta">
                      {title.startYear && <span>{title.startYear}</span>}
                      {title.rating?.aggregateRating && (
                        <span>★ {title.rating.aggregateRating.toFixed(1)}</span>
                      )}
                      <span>{title.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Filter Chips */}
        <div className="search-filters">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`filter-chip ${filterType === f.key ? 'active' : ''}`}
              onClick={() => setFilterType(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Results */}
      <div className="search-results">
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="loading-spinner" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="search-empty">
            <div className="empty-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try a different search term or filter</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="search-results-count">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </p>
            <div className="search-results-grid">
              {results.map((title) => (
                <TitleCard key={title.id} title={title} onClick={handleTitleClick} />
              ))}
            </div>
          </>
        )}
      </div>

      <TitleDetailModal
        title={selectedTitle}
        onClose={() => setSelectedTitle(null)}
      />
    </div>
  );
}
