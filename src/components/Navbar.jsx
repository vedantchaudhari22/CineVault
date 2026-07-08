import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getInitials = () => {
    if (!user) return '?';
    const name = user.displayName || user.email || '';
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="main-navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <svg viewBox="0 0 28 28" fill="none">
          <rect x="2" y="4" width="8" height="20" rx="2" fill="url(#grad)" />
          <rect x="12" y="2" width="8" height="24" rx="2" fill="url(#grad)" opacity="0.8" />
          <rect x="22" y="6" width="4" height="16" rx="2" fill="url(#grad)" opacity="0.6" />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
              <stop stopColor="#e50914" />
              <stop offset="1" stopColor="#7b2ff7" />
            </linearGradient>
          </defs>
        </svg>
        CineVault
      </div>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
          Home
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>
          Search
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
          Profile
        </NavLink>
      </div>

      <div className="navbar-right">
        <div className="navbar-avatar" onClick={() => navigate('/profile')} title="Profile">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
          ) : (
            getInitials()
          )}
        </div>
      </div>
    </nav>
  );
}
