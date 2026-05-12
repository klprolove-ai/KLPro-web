import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';
import { disconnectSocket } from '../api/socket';
import LocationPopup from '../components/LocationPopup';
import './Profile.css';

const formatCurrency = (amount) => `INR ${Number(amount || 0).toLocaleString('en-IN')}`;

function Profile() {
  const navigate = useNavigate();
  const authToken = localStorage.getItem('userToken') || localStorage.getItem('token') || '';
  const accountSectionRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [savedProfessionals, setSavedProfessionals] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('savedProfessionals') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (parseError) {
      return [];
    }
  });
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('profilePreferences')) || {
        orderAlerts: true,
        offersAndDeals: true,
        serviceReminders: false,
      };
    } catch (prefError) {
      return {
        orderAlerts: true,
        offersAndDeals: true,
        serviceReminders: false,
      };
    }
  });

  const fetchProfile = useCallback(async () => {
    try {
      if (!authToken) {
        navigate('/login');
        return;
      }

      setLoading(true);
      setError('');

      const [profileResponse, bookingsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/bookings`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!profileResponse.ok) {
        if (profileResponse.status === 401 || profileResponse.status === 403) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await profileResponse.json();
      setProfile(data);
      setEditData(data);

      if (bookingsResponse.ok) {
        const bookingData = await bookingsResponse.json();
        setBookings(Array.isArray(bookingData) ? bookingData : []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [navigate, authToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    localStorage.setItem('profilePreferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const syncSaved = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('savedProfessionals') || '[]');
        setSavedProfessionals(Array.isArray(stored) ? stored : []);
      } catch (parseError) {
        setSavedProfessionals([]);
      }
    };

    syncSaved();
    window.addEventListener('focus', syncSaved);
    return () => window.removeEventListener('focus', syncSaved);
  }, []);

  const accountStats = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter((booking) => ['pending', 'confirmed', 'in-progress'].includes(booking.status)).length;
    const completed = bookings.filter((booking) => booking.status === 'completed').length;
    const spend = bookings
      .filter((booking) => booking.status !== 'cancelled')
      .reduce((sum, booking) => sum + (Number(booking.price) || 0), 0);

    const completionChecks = [
      Boolean(profile?.name),
      Boolean(profile?.email),
      Boolean(profile?.phone),
      Boolean(profile?.city),
      Boolean(profile?.address),
    ];
    const completion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

    return {
      total,
      upcoming,
      completed,
      spend,
      completion,
    };
  }, [bookings, profile]);

  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 4),
    [bookings]
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'account', label: 'Account Details' },
    { id: 'saved', label: 'Saved Professionals' },
    { id: 'preferences', label: 'Preferences' },
  ];

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUseCurrentLocation = () => {
    setShowLocationPopup(true);
  };

  const handleLocationUpdate = (newLocation) => {
    setEditData((prev) => ({
      ...prev,
      city: newLocation,
    }));
    setSuccessMessage('Location updated successfully. Save changes to update your profile.');
  };

  const handleSaveProfile = async () => {
    try {
      setError('');
      setSuccessMessage('');

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editData.name,
          phone: editData.phone,
          address: editData.address,
          city: editData.city,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updated = await response.json();
      setProfile(updated);
      setEditData(updated);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully.');

      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) {
        user.name = updated.name;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    navigate('/');
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRemoveSavedProfessional = (id) => {
    const next = savedProfessionals.filter((professional) => String(professional.id) !== String(id));
    setSavedProfessionals(next);
    localStorage.setItem('savedProfessionals', JSON.stringify(next));

    try {
      const ids = JSON.parse(localStorage.getItem('savedProfessionalIds') || '[]');
      const filteredIds = Array.isArray(ids)
        ? ids.filter((savedId) => String(savedId) !== String(id))
        : [];
      localStorage.setItem('savedProfessionalIds', JSON.stringify(filteredIds));
    } catch (parseError) {
      localStorage.setItem('savedProfessionalIds', JSON.stringify([]));
    }
  };

  const handleClearSavedProfessionals = () => {
    setSavedProfessionals([]);
    localStorage.setItem('savedProfessionals', JSON.stringify([]));
    localStorage.setItem('savedProfessionalIds', JSON.stringify([]));
  };

  const openEditProfile = () => {
    setEditData(profile || {});
    setActiveTab('account');
    setIsEditing(true);

    // Wait for the account panel to render before scrolling.
    window.requestAnimationFrame(() => {
      accountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (loading) {
    return (
      <div className="profile">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile">
        <div className="error">{error || 'Profile not found'}</div>
      </div>
    );
  }

  const firstName = profile.name?.split(' ')[0] || 'User';
  const joinedDate = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently';

  return (
    <div className="profile">
      <section className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-avatar">{firstName.charAt(0).toUpperCase()}</div>
          <div className="profile-header-info">
            <h1>{profile.name}</h1>
            <p>{profile.email}</p>
            <div className="hero-meta-row">
              <span className="user-type-badge">{profile.userType}</span>
              <span className="joined-badge">Member since {joinedDate}</span>
            </div>
          </div>
        </div>
          <div className="profile-hero-actions">
          <button type="button" onClick={() => navigate('/bookings')}>My Orders</button>
          <button type="button" onClick={() => navigate('/user/bookings')}>Professional Bookings</button>
          <button type="button" onClick={() => navigate('/orders-list')}>My Product Orders</button>
          <button type="button" onClick={() => navigate('/services')}>Explore Services</button>
          <button type="button" onClick={openEditProfile}>Edit Profile</button>
          <a 
            href="https://wa.me/8738030604" 
            target="_blank" 
            rel="noopener noreferrer"
            className="whatsapp-button"
            title="Emergency Time Connect With Whatsapp AI Doctor"
          >
            <span>🔔 Emergency Time</span>
            <span>Connect With Whatsapp AI Doctor</span>
          </a>
          <a 
            href="https://play.google.com/store/apps/details?id=in.cdac.ners.psa.mobile.android.national" 
            target="_blank" 
            rel="noopener noreferrer"
            className="app-download-button"
            title="Download The App For Safety"
          >
            <span>📱 Click Link & Download The App</span>
            <span>For Safety</span>
          </a>
        </div>
      </section>

      <section className="profile-insights-grid">
        <article className="insight-card">
          <span>Total Orders</span>
          <strong>{accountStats.total}</strong>
          <p>All bookings placed so far</p>
        </article>
        <article className="insight-card">
          <span>Upcoming</span>
          <strong>{accountStats.upcoming}</strong>
          <p>Pending and confirmed services</p>
        </article>
        <article className="insight-card">
          <span>Completed</span>
          <strong>{accountStats.completed}</strong>
          <p>Successfully completed bookings</p>
        </article>
        <article className="insight-card">
          <span>Total Spend</span>
          <strong>INR {accountStats.spend}</strong>
          <p>Across active and completed bookings</p>
        </article>
      </section>

      <section className="account-completion">
        <div>
          <h2>Account Completion</h2>
          <p>Complete your profile for smoother checkout and faster support.</p>
        </div>
        <div className="completion-meter-wrap">
          <div className="completion-meter">
            <div style={{ width: `${accountStats.completion}%` }} />
          </div>
          <span>{accountStats.completion}%</span>
        </div>
      </section>

      <section className="profile-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {error && <div className="profile-error">{error}</div>}
      {successMessage && <div className="profile-success">{successMessage}</div>}

      {activeTab === 'overview' && (
        <>
          <section className="profile-grid-layout">
          <div className="profile-panel recent-orders">
            <div className="panel-header">
              <h3>Recent Orders</h3>
              <button type="button" onClick={() => navigate('/bookings')}>View All</button>
            </div>
            {recentBookings.length ? (
              <div className="timeline-list">
                {recentBookings.map((booking) => (
                  <article key={booking._id} className="timeline-item">
                    <div>
                      <h4>{booking?.serviceId?.name || 'Service'}</h4>
                      <p>
                        {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : '-'} at {booking.scheduledTime || '-'}
                      </p>
                    </div>
                    <div className="timeline-right">
                      <span className={`status-pill ${booking.status || 'pending'}`}>{(booking.status || 'pending').replace('-', ' ')}</span>
                      <strong>INR {booking.price || 0}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-note">No orders yet. Start by exploring our top-rated services.</p>
            )}
          </div>

          <div className="profile-panel quick-actions-panel">
            <h3>Quick Actions</h3>
            <div className="quick-actions-grid">
              <button type="button" onClick={() => navigate('/services')}>Book a Service</button>
              <button type="button" onClick={() => navigate('/professionals')}>Find Professionals</button>
              <button type="button" onClick={() => setActiveTab('account')}>Update Address</button>
              <button type="button" onClick={() => navigate('/bookings')}>Track Bookings</button>
            </div>
          </div>
          </section>
          <section className="profile-panel saved-preview-panel">
            <div className="panel-header">
              <h3>Saved Professionals</h3>
              <button type="button" onClick={() => setActiveTab('saved')}>Manage Saved</button>
            </div>
            {savedProfessionals.length ? (
              <div className="saved-preview-list">
                {savedProfessionals.slice(0, 3).map((professional) => (
                  <article key={`saved-preview-${professional.id}`}>
                    <strong>{professional.name}</strong>
                    <p>{professional.specialization} | ⭐ {Number(professional.rating || 0).toFixed(1)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-note">No saved professionals yet. Save favorites from the professionals catalog.</p>
            )}
          </section>
        </>
      )}

      {activeTab === 'account' && (
        <section ref={accountSectionRef} className="profile-panel account-panel">
          <div className="panel-header">
            <h3>Account Details</h3>
            {!isEditing && (
              <button type="button" onClick={openEditProfile}>Edit Profile</button>
            )}
          </div>

          {isEditing ? (
            <div className="profile-edit-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={editData.name || ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editData.email || ''}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone || ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <div className="city-input-row">
                  <input
                    type="text"
                    name="city"
                    value={editData.city || ''}
                    onChange={handleEditChange}
                  />
                  <button
                    type="button"
                    className="btn-detect-city"
                    onClick={handleUseCurrentLocation}
                  >
                    Use My Current Location
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={editData.address || ''}
                  onChange={handleEditChange}
                  rows="3"
                />
              </div>
              <div className="edit-actions">
                <button className="btn-save" onClick={handleSaveProfile}>Save Changes</button>
                <button className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="profile-details">
              <div className="detail-item">
                <label>Email</label>
                <p>{profile.email}</p>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <p>{profile.phone || 'Not provided'}</p>
              </div>
              <div className="detail-item">
                <label>City</label>
                <p>{profile.city || 'Not provided'}</p>
              </div>
              <div className="detail-item full-row">
                <label>Address</label>
                <p>{profile.address || 'Not provided'}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'preferences' && (
        <section className="profile-grid-layout">
          <div className="profile-panel preferences-panel">
            <h3>Notification Preferences</h3>
            <p className="panel-subtitle">Control how you hear from us about bookings and offers.</p>
            <div className="toggle-list">
              <button type="button" className="toggle-row" onClick={() => togglePreference('orderAlerts')}>
                <div>
                  <strong>Order Alerts</strong>
                  <p>Instant updates for booked services.</p>
                </div>
                <span className={`switch ${preferences.orderAlerts ? 'on' : ''}`} />
              </button>
              <button type="button" className="toggle-row" onClick={() => togglePreference('offersAndDeals')}>
                <div>
                  <strong>Offers & Deals</strong>
                  <p>Personalized discounts and limited offers.</p>
                </div>
                <span className={`switch ${preferences.offersAndDeals ? 'on' : ''}`} />
              </button>
              <button type="button" className="toggle-row" onClick={() => togglePreference('serviceReminders')}>
                <div>
                  <strong>Service Reminders</strong>
                  <p>Periodic reminders for recurring services.</p>
                </div>
                <span className={`switch ${preferences.serviceReminders ? 'on' : ''}`} />
              </button>
            </div>
          </div>

          <div className="profile-panel profile-danger-zone">
            <h3>Account Actions</h3>
            <p>Sign out securely from this device at any time.</p>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </section>
      )}

      {activeTab === 'saved' && (
        <section className="profile-panel saved-pros-panel">
          <div className="panel-header">
            <h3>Saved Professionals</h3>
            {savedProfessionals.length > 0 && (
              <button type="button" onClick={handleClearSavedProfessionals}>Clear All</button>
            )}
          </div>

          {savedProfessionals.length ? (
            <div className="saved-pros-grid">
              {savedProfessionals.map((professional) => (
                <article key={`saved-pro-${professional.id}`} className="saved-pro-card">
                  <div className="saved-pro-top">
                    <span className="saved-pro-badge">{professional.badge || 'Saved'}</span>
                    <button type="button" onClick={() => handleRemoveSavedProfessional(professional.id)}>Remove</button>
                  </div>
                  <h4>{professional.name}</h4>
                  <p>{professional.specialization}</p>
                  <div className="saved-pro-meta">
                    <span>⭐ {Number(professional.rating || 0).toFixed(1)}</span>
                    <span>{professional.experienceYears || 0}+ yrs</span>
                    <span>{professional.location || 'Lucknow'}</span>
                  </div>
                  <div className="saved-pro-footer">
                    <strong>{formatCurrency(professional.startingPrice || 0)}</strong>
                    <button type="button" onClick={() => navigate('/professionals')}>View Profile</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="saved-empty-state">
              <p>No saved professionals yet. Tap the heart icon on a professional card to save favorites.</p>
              <button type="button" onClick={() => navigate('/professionals')}>Browse Professionals</button>
            </div>
          )}
        </section>
      )}

      {activeTab !== 'preferences' && (
        <div className="profile-panel profile-danger-zone inline-danger">
          <h3>Account Actions</h3>
          <p>Sign out securely from this device at any time.</p>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      )}

      <LocationPopup
        isOpen={showLocationPopup}
        onClose={() => setShowLocationPopup(false)}
        onLocationUpdate={handleLocationUpdate}
        currentLocation={editData.city || profile?.city}
      />
    </div>
  );
}

export default Profile;
