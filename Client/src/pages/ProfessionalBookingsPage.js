import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import BookingCancelDialog from '../components/BookingCancelDialog';
import BookingRouteCard from '../components/BookingRouteCard';
import './ProfessionalBookingsPage.css';

const ProfessionalBookingsPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'cancel', 'reschedule'
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [navigate]);

  useEffect(() => {
    // inline filter logic to avoid missing dependency lint warnings
    let filtered = bookings;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === filterStatus);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.professionalName?.toLowerCase().includes(search) ||
        booking.serviceName?.toLowerCase().includes(search) ||
        booking._id?.includes(search)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, filterStatus, searchTerm]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // For professional view, call the professional-specific endpoint so we get professional currentLocation
      const response = await axios.get(`${API_BASE_URL}/bookings/professional/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Support both response shapes: { bookings: [...] } or { data: [...] }
      const bookingsData = response.data?.bookings || response.data?.data || response.data || [];

      const enrichedBookings = Array.isArray(bookingsData)
        ? bookingsData.map(booking => ({
            ...booking,
            professionalId: booking.professionalId || {},
            // keep serviceAddress and customer fields as-is
          }))
        : [];

      setBookings(enrichedBookings);
      setError(null);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load bookings');
      } else {
        setBookings([]);
      }
      console.error('Bookings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'accepted': '#17a2b8',
      'in-progress': '#007bff',
      'completed': '#28a745',
      'cancelled': '#dc3545',
      'confirmed': '#20c997'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'pending': '⏳',
      'accepted': '✅',
      'in-progress': '🔄',
      'completed': '✓',
      'cancelled': '❌',
      'confirmed': '🎯'
    };
    return icons[status] || '📋';
  };

  const handleCancelBooking = async (reason) => {
    try {
      const token = localStorage.getItem('token');
      const cancelReason = String(reason || '').trim();
      if (!cancelReason) {
        setError('Please provide a reason for cancellation');
        return;
      }
      await axios.post(
        `${API_BASE_URL}/bookings/${selectedBooking._id}/cancel`,
        { reason: cancelReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setBookings(bookings.map(booking =>
        booking._id === selectedBooking._id ? { ...booking, status: 'cancelled' } : booking
      ));
      
      setShowModal(false);
      setSelectedBooking(null);
      setCancelTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const openViewModal = (booking) => {
    setSelectedBooking(booking);
    setModalMode('view');
    setShowModal(true);
  };

  const openCancelModal = (booking) => {
    setSelectedBooking(booking);
    setModalMode('cancel');
    setCancelTarget(booking);
    setShowModal(false);
  };

  const openRescheduleModal = (booking) => {
    setSelectedBooking(booking);
    setModalMode('reschedule');
    setNewDate(booking.bookingDate ? new Date(booking.bookingDate).toISOString().split('T')[0] : '');
    setNewTime(booking.bookingTime || '');
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="bookings-container">
        <div className="skeleton-loader">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-box"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-container">
      <div className="page-header">
        <button 
          className="btn-back"
          onClick={() => navigate('/user/dashboard')}
        >
          ← Back to Dashboard
        </button>
        <h1>📅 My Professional Bookings</h1>
        <p className="subtitle">Manage all your bookings with professionals</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Bookings</span>
          <span className="stat-value">{bookings.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value">{bookings.filter(b => b.status === 'pending').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Confirmed</span>
          <span className="stat-value">{bookings.filter(b => ['accepted', 'confirmed'].includes(b.status)).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{bookings.filter(b => b.status === 'completed').length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input 
          type="text"
          placeholder="Search by professional name, service, or booking ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          {['all', 'pending', 'accepted', 'in-progress', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="bookings-list">
          {filteredBookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-header">
                <div className="booking-title">
                  <span className="status-icon">{getStatusIcon(booking.status)}</span>
                  <div>
                    <h3>{booking.serviceName || 'Service Booking'}</h3>
                    <p className="booking-id">Booking ID: {booking._id}</p>
                  </div>
                </div>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(booking.status) }}
                >
                  {booking.status.toUpperCase()}
                </span>
              </div>

              <div className="booking-content">
                <div className="booking-section">
                  <h4>Professional Information</h4>
                  <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">{booking.professionalName || 'N/A'}</span>
                  </div>
                  {booking.professionalPhone && (
                    <div className="info-row">
                      <span className="label">Contact:</span>
                      <span className="value">{booking.professionalPhone}</span>
                    </div>
                  )}
                  {booking.professionalRating && (
                    <div className="info-row">
                      <span className="label">Rating:</span>
                      <span className="value">⭐ {booking.professionalRating} / 5</span>
                    </div>
                  )}
                </div>

                <div className="booking-section">
                  <h4>Booking Details</h4>
                  {booking.bookingDate && (
                    <div className="info-row">
                      <span className="label">Date:</span>
                      <span className="value">{new Date(booking.bookingDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  {booking.bookingTime && (
                    <div className="info-row">
                      <span className="label">Time:</span>
                      <span className="value">{booking.bookingTime}</span>
                    </div>
                  )}
                  {booking.duration && (
                    <div className="info-row">
                      <span className="label">Duration:</span>
                      <span className="value">{booking.duration} hours</span>
                    </div>
                  )}
                  {booking.totalAmount && (
                    <div className="info-row amount">
                      <span className="label">Amount:</span>
                      <span className="value">₹{booking.totalAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</span>
                    </div>
                  )}
                </div>

                {booking.description && (
                  <div className="booking-section">
                    <h4>Description</h4>
                    <p className="description">{booking.description}</p>
                  </div>
                )}

                {booking.location && (
                  <div className="booking-section">
                    <h4>Location</h4>
                    <p className="description">{booking.location}</p>
                  </div>
                )}

                {['confirmed', 'in-progress'].includes(String(booking.status || '')) && (
                  (() => {
                    const professionalLoc = booking.professionalId?.currentLocation || null;
                    // Prefer customer currentLocation if available, otherwise fall back to serviceAddress
                    let customerLoc = booking.customerId?.currentLocation || booking.serviceAddress || null;

                    // If no structured serviceAddress, try to build a fallback address from customer profile fields
                    if (!customerLoc && booking.customerId) {
                      const parts = [booking.customerId.address, booking.customerId.city, booking.customerId.currentCity]
                        .filter(Boolean)
                        .map(p => String(p).trim());
                      const addressStr = parts.join(', ');
                      if (addressStr) {
                        customerLoc = { address: addressStr };
                      }
                    }

                    if (professionalLoc && (customerLoc)) {
                      return (
                        <BookingRouteCard
                          title="Customer Location & Route"
                          // origin: professional (the professional's current/your location)
                          originLocation={professionalLoc}
                          // destination: customer/service address
                          destinationLocation={customerLoc}
                          originLabel="Your location"
                          destinationLabel="Customer location"
                        />
                      );
                    }

                    if (!professionalLoc) {
                      return (
                        <div className="booking-section" style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
                          <p style={{ margin: 0, color: '#1976d2' }}>
                            📍 Professional location tracking will be available once the professional comes online.
                          </p>
                        </div>
                      );
                    }

                    if (professionalLoc && !customerLoc) {
                      return (
                        <div className="booking-section" style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ffcc80' }}>
                          <p style={{ margin: 0, color: '#a65a00' }}>
                            🧭 Customer address is not available; distance cannot be calculated.
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })()
                )}

                {booking.cancelReason && (
                  <div className="booking-section">
                    <h4>Cancellation Reason</h4>
                    <p className="description">{booking.cancelReason}</p>
                  </div>
                )}
              </div>

              <div className="booking-footer">
                <span className="created-date">
                  📅 Booked on: {new Date(booking.createdAt).toLocaleDateString('en-IN')}
                </span>
                <div className="action-buttons">
                  <button
                    className="btn-view"
                    onClick={() => openViewModal(booking)}
                  >
                    View Details
                  </button>
                  {['pending', 'accepted', 'confirmed'].includes(booking.status) && (
                    <>
                      <button
                        className="btn-reschedule"
                        onClick={() => openRescheduleModal(booking)}
                      >
                        Reschedule
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => openCancelModal(booking)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h2>No Bookings Found</h2>
          <p>
            {filterStatus === 'all' && searchTerm === ''
              ? 'You haven\'t booked any professionals yet.'
              : 'No bookings match your filters.'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/professionals')}
          >
            Book a Professional
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {modalMode === 'view' && (
              <>
                <h2>Booking Details</h2>
                <div className="modal-body">
                  <div className="detail-group">
                    <h4>Service</h4>
                    <p>{selectedBooking.serviceName}</p>
                  </div>
                  <div className="detail-group">
                    <h4>Professional</h4>
                    <p>{selectedBooking.professionalName}</p>
                  </div>
                  <div className="detail-group">
                    <h4>Date & Time</h4>
                    <p>
                      {new Date(selectedBooking.bookingDate).toLocaleDateString('en-IN')} at {selectedBooking.bookingTime}
                    </p>
                  </div>
                  {selectedBooking.location && (
                    <div className="detail-group">
                      <h4>Location</h4>
                      <p>{selectedBooking.location}</p>
                    </div>
                  )}
                  <div className="detail-group">
                    <h4>Amount</h4>
                    <p className="amount">₹{selectedBooking.totalAmount?.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</p>
                  </div>
                  {selectedBooking.description && (
                    <div className="detail-group">
                      <h4>Description</h4>
                      <p>{selectedBooking.description}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {modalMode === 'reschedule' && (
              <>
                <h2>Reschedule Booking</h2>
                <div className="modal-body">
                  <p className="booking-service">{selectedBooking.serviceName}</p>
                  <div className="form-group">
                    <label>New Date</label>
                    <input 
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>New Time</label>
                    <input 
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="modal-actions">
              {modalMode === 'view' && (
                <>
                  {['pending', 'accepted', 'confirmed'].includes(selectedBooking.status) && (
                    <>
                      <button
                        className="btn-reschedule"
                        onClick={() => openRescheduleModal(selectedBooking)}
                      >
                        Reschedule
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => openCancelModal(selectedBooking)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button className="btn-close" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                </>
              )}

              {modalMode === 'cancel' && (
                <>
                  <button
                    className="btn-danger"
                    onClick={handleCancelBooking}
                  >
                    Yes, Cancel Booking
                  </button>
                  <button
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  >
                    No, Keep Booking
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <BookingCancelDialog
        isOpen={Boolean(cancelTarget)}
        title="Cancel Booking"
        message="Please provide a cancellation reason. This will be visible to the professional and admin."
        confirmLabel="Cancel Booking"
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => handleCancelBooking(reason)}
      />
    </div>
  );
};

export default ProfessionalBookingsPage;
