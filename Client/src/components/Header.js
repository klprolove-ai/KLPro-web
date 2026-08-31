
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';
import { disconnectSocket } from '../api/socket';
import { getCartCount } from '../utils/cart';
import { trackSearch } from '../utils/analytics';
import './Header.css';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const suggestionsRef = useRef(null);
  const [authUser, setAuthUser] = useState(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch all products and services for suggestions (on mount)
  useEffect(() => {
    const fetchSuggestionsData = async () => {
      try {
        const [productsRes, servicesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/products?limit=1000`),
          fetch(`${API_BASE_URL}/services`),
        ]);
        const productsPayload = await productsRes.json();
        const servicesPayload = await servicesRes.json();
        const products = Array.isArray(productsPayload) ? productsPayload : productsPayload.products || [];
        const services = Array.isArray(servicesPayload) ? servicesPayload : servicesPayload.services || [];
        setAllProducts(products);
        setAllServices(services);
      } catch (err) {
        // Ignore errors for suggestions
      }
    };
    fetchSuggestionsData();
  }, []);

  // Handle click outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Sync auth state and cart count
  useEffect(() => {
    const syncAuthState = () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminEmail = localStorage.getItem('adminEmail');
      const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');
      const storedUserRaw = localStorage.getItem('user');

      let storedUser = null;
      if (storedUserRaw) {
        try {
          storedUser = JSON.parse(storedUserRaw);
        } catch (parseError) {
          storedUser = null;
        }
      }

      if (adminToken && (adminEmail || storedUser?.userType === 'admin')) {
        const resolvedEmail = adminEmail || storedUser?.email || 'admin@localhost';
        setIsAdminSession(true);
        setAuthUser({
          name: storedUser?.name || 'Admin',
          email: resolvedEmail,
          userType: 'admin',
        });
        return;
      }

      if (userToken && storedUser) {
        setIsAdminSession(false);
        setAuthUser(storedUser);
        return;
      }

      setIsAdminSession(false);
      setAuthUser(null);
    };

    syncAuthState();
    setCartCount(getCartCount());
    setShowUserMenu(false);

    const onStorage = () => syncAuthState();
    const onCartUpdate = () => setCartCount(getCartCount());
    window.addEventListener('storage', onStorage);
    window.addEventListener('cartUpdated', onCartUpdate);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cartUpdated', onCartUpdate);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/products') {
      const params = new URLSearchParams(location.search);
      setSearchQuery(params.get('search') || '');
    }
  }, [location.pathname, location.search]);

  // Suggestion logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const query = searchQuery.trim().toLowerCase();
    // Product suggestions
    const productSuggestions = allProducts
      .filter((p) =>
        p.name?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.subcategory?.toLowerCase?.().includes(query) ||
        p.subSubcategory?.toLowerCase?.().includes(query)
      )
      .slice(0, 5)
      .map((p) => ({
        type: 'product',
        id: p._id || p.id,
        name: p.name,
        category: p.category,
      }));
    // Service suggestions
    const serviceSuggestions = allServices
      .filter((s) =>
        s.name?.toLowerCase().includes(query) ||
        s.category?.toLowerCase().includes(query) ||
        s.subCategory?.toLowerCase?.().includes(query) ||
        s.subSubCategory?.toLowerCase?.().includes(query)
      )
      .slice(0, 5)
      .map((s) => ({
        type: 'service',
        id: s._id || s.id,
        name: s.name,
        category: s.category,
      }));
    setSuggestions([...productSuggestions, ...serviceSuggestions]);
  }, [searchQuery, allProducts, allServices]);

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    setSearchQuery(suggestion.name);
    if (suggestion.type === 'product') {
      navigate(`/product/${suggestion.id}`);
    } else if (suggestion.type === 'service') {
      navigate(`/services?search=${encodeURIComponent(suggestion.name)}`);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    
    // Only navigate if there's actual input
    if (!query) {
      setShowSuggestions(false);
      return;
    }

    trackSearch(query);

    // Count matching services vs products from suggestions
    const serviceMatches = suggestions.filter(s => s.type === 'service').length;
    const productMatches = suggestions.filter(s => s.type === 'product').length;

    // Route to services if more service matches, otherwise products
    if (serviceMatches > productMatches) {
      navigate(`/services?search=${encodeURIComponent(query)}`);
    } else {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
    
    setShowSuggestions(false);
  };

  const handleLogout = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');

      if (adminToken) {
        await fetch(`${API_BASE_URL}/admin/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });
      } else if (userToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Clear storage
    disconnectSocket();
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    setAuthUser(null);
    setIsAdminSession(false);
    setShowUserMenu(false);
    navigate('/');
  };

  useEffect(() => {
    if (!authUser || authUser.userType !== 'professional') return undefined;

    let mounted = true;

    const forceLogoutIfRejected = async () => {
      try {
        const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');
        if (!userToken) return;

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!mounted) return;

        if (!response.ok) {
          if (response.status === 403 || response.status === 401) {
            disconnectSocket();
            localStorage.removeItem('userToken');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuthUser(null);
            setIsAdminSession(false);
            setShowUserMenu(false);
            navigate('/login');
          }
          return;
        }

        const profile = await response.json();
        if (String(profile?.approvalStatus || '').toLowerCase() === 'rejected') {
          disconnectSocket();
          localStorage.removeItem('userToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setAuthUser(null);
          setIsAdminSession(false);
          setShowUserMenu(false);
          navigate('/login');
        }
      } catch (error) {
        // Ignore transient failures.
      }
    };

    forceLogoutIfRejected();
    const timer = window.setInterval(forceLogoutIfRejected, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [authUser, navigate]);

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-section">
          <Link to="/" className="logo-link">
            <img src="/kl.png" alt="KLPro Pvt Ltd Logo" className="logo" />
          </Link>
        </div>
        
        <div className="header-search" ref={suggestionsRef} style={{ position: 'relative' }}>
          <form onSubmit={handleSearch} autoComplete="off">
            <input
              type="text"
              placeholder="What are you looking for?"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => searchQuery && setShowSuggestions(true)}
              autoComplete="off"
            />
            <button type="submit">Search</button>
          </form>
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions-dropdown">
              {suggestions.map((s, idx) => (
                <div
                  key={s.type + '-' + s.id + '-' + idx}
                  className="search-suggestion-item"
                  onClick={() => handleSuggestionClick(s)}
                >
                  <span className="suggestion-type">{s.type === 'product' ? 'Product' : 'Service'}</span>
                  <span className="suggestion-name">{s.name}</span>
                  {s.category && <span className="suggestion-category">({s.category})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <nav className="navbar">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/services" className="nav-link">Services</Link>
          <Link to="/professionals" className="nav-link">Professionals</Link>
          <Link to="/products" className="nav-link">Products</Link>
          <Link to="/cart" className="nav-link cart-nav-link">
            <span>Add To Cart</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <Link
            to={authUser?.userType === 'professional' ? '/professional/dashboard' : '/bookings'}
            className="nav-link"
          >
            {authUser?.userType === 'professional' ? 'My Dashboard' : 'My Bookings'}
          </Link>
          
          {authUser ? (
            <div className="user-menu-container">
              <button 
                className="user-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="user-avatar">{authUser?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                <span className="user-name">{authUser?.name || 'User'}</span>
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown">
                  {isAdminSession ? (
                    <Link to="/admin/dashboard" className="dropdown-item">
                      Admin Dashboard
                    </Link>
                  ) : authUser?.userType === 'professional' ? (
                    <Link to="/professional/dashboard" className="dropdown-item">
                      Professional Dashboard
                    </Link>
                  ) : (
                    <Link to="/profile" className="dropdown-item">
                      My Profile
                    </Link>
                  )}
                  <button 
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="nav-link login-link">
                SignIn
              </Link>
              <Link to="/login?mode=signup" className="nav-link signup-link">
                SignUp
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
