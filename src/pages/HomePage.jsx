import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import HeroBanner from '../components/HeroBanner';
import TitleCarousel from '../components/TitleCarousel';
import TitleCard from '../components/TitleCard';
import TitleDetailModal from '../components/TitleDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { getTopShows, getTitlesByGenre, listTitles, GENRES } from '../services/api';
import { addToWatchlist, isInWatchlist } from '../services/userDataService';

export default function HomePage() {
  const { user } = useAuth();
  const { refreshKey } = useNetwork();

  // Hero state
  const [heroTitle, setHeroTitle] = useState(null);

  // Top shows
  const [topShows, setTopShows] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  // Genre rows (load first 5 genres)
  const [genreData, setGenreData] = useState({});
  const [genreLoading, setGenreLoading] = useState({});

  // All titles (infinite scroll)
  const [allTitles, setAllTitles] = useState([]);
  const [allTitlesPageToken, setAllTitlesPageToken] = useState(null);
  const [allTitlesLoading, setAllTitlesLoading] = useState(false);
  const [allTitlesHasMore, setAllTitlesHasMore] = useState(true);

  // Modal
  const [selectedTitle, setSelectedTitle] = useState(null);

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({
    threshold: 0,
    rootMargin: '400px',
  });

  // Fetch top shows
  useEffect(() => {
    const controller = new AbortController();
    setTopLoading(true);

    getTopShows(controller.signal)
      .then((data) => {
        const titles = data.titles || [];
        setTopShows(titles);
        if (titles.length > 0) {
          // Pick a random title with an image for the hero
          const withImage = titles.filter(t => t.primaryImage?.url);
          setHeroTitle(withImage.length > 0 ? withImage[0] : titles[0]);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Failed to load top shows:', err);
      })
      .finally(() => setTopLoading(false));

    return () => controller.abort();
  }, [refreshKey]);

  // Fetch genre rows sequentially to avoid API rate-limiting
  const displayGenres = useMemo(() => GENRES.slice(0, 6), []);

  useEffect(() => {
    let cancelled = false;

    async function loadGenres() {
      for (const genre of displayGenres) {
        if (cancelled) break;
        setGenreLoading(prev => ({ ...prev, [genre]: true }));
        try {
          const data = await getTitlesByGenre(genre);
          if (!cancelled) {
            setGenreData(prev => ({ ...prev, [genre]: data.titles || [] }));
          }
        } catch (err) {
          if (!cancelled) console.error(`Failed to load ${genre}:`, err);
        } finally {
          if (!cancelled) {
            setGenreLoading(prev => ({ ...prev, [genre]: false }));
          }
        }
      }
    }

    loadGenres();
    return () => { cancelled = true; };
  }, [displayGenres, refreshKey]);

  // Fetch all titles (initial)
  useEffect(() => {
    const controller = new AbortController();
    setAllTitlesLoading(true);

    listTitles({
      sortBy: 'SORT_BY_POPULARITY',
      sortOrder: 'ASC',
    }, controller.signal)
      .then((data) => {
        setAllTitles(data.titles || []);
        setAllTitlesPageToken(data.nextPageToken || null);
        setAllTitlesHasMore(!!data.nextPageToken);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Failed to load all titles:', err);
      })
      .finally(() => setAllTitlesLoading(false));

    return () => controller.abort();
  }, [refreshKey]);

  // Load more titles (infinite scroll)
  useEffect(() => {
    if (!loadMoreInView || allTitlesLoading || !allTitlesHasMore || !allTitlesPageToken) return;

    const controller = new AbortController();
    setAllTitlesLoading(true);

    listTitles({
      sortBy: 'SORT_BY_POPULARITY',
      sortOrder: 'ASC',
      pageToken: allTitlesPageToken,
    }, controller.signal)
      .then((data) => {
        setAllTitles(prev => [...prev, ...(data.titles || [])]);
        setAllTitlesPageToken(data.nextPageToken || null);
        setAllTitlesHasMore(!!data.nextPageToken);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Failed to load more titles:', err);
      })
      .finally(() => setAllTitlesLoading(false));

    return () => controller.abort();
  }, [loadMoreInView, allTitlesPageToken, allTitlesLoading, allTitlesHasMore]);

  const handleTitleClick = useCallback((title) => {
    setSelectedTitle(title);
  }, []);

  const handleWatchlistAdd = useCallback((title) => {
    if (user) {
      addToWatchlist(user.uid, title);
    }
  }, [user]);

  const heroInWatchlist = useMemo(() => {
    return heroTitle && user ? isInWatchlist(user.uid, heroTitle.id) : false;
  }, [heroTitle, user]);

  return (
    <div className="home-page" id="home-page">
      {/* Hero Banner */}
      <HeroBanner
        title={heroTitle}
        onWatchlistClick={handleWatchlistAdd}
        isInWatchlist={heroInWatchlist}
      />

      {/* Today's Top Shows */}
      <TitleCarousel
        title="🔥 Today's Top Shows"
        titles={topShows}
        loading={topLoading}
        onTitleClick={handleTitleClick}
      />

      {/* Genre Rows */}
      {displayGenres.map((genre) => (
        <TitleCarousel
          key={genre}
          title={genre}
          titles={genreData[genre] || []}
          loading={genreLoading[genre] ?? true}
          onTitleClick={handleTitleClick}
        />
      ))}

      {/* All Movies & TV Shows */}
      <div className="section-header">
        <h2 className="section-title">
          <span className="title-accent" />
          All Movies & TV Shows
        </h2>
      </div>

      <div className="all-titles-grid" id="all-titles-grid">
        {allTitles.map((title) => (
          <TitleCard key={title.id} title={title} onClick={handleTitleClick} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {allTitlesHasMore && (
        <div ref={loadMoreRef} className="load-more-trigger">
          {allTitlesLoading && <div className="loading-spinner" />}
        </div>
      )}

      {/* Detail Modal */}
      <TitleDetailModal
        title={selectedTitle}
        onClose={() => setSelectedTitle(null)}
      />
    </div>
  );
}
