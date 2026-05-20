import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import { useCall } from '../context/CallContext';
import BookingCancelDialog from '../components/BookingCancelDialog';
import BookingRouteCard from '../components/BookingRouteCard';
import './WorkOrdersPage.css';

const WorkOrdersPage = () => {
  const navigate = useNavigate();
  const { startBookingAudioCall, isCallBusy } = useCall();
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [startOtp, setStartOtp] = useState('');
  const [startPhoto, setStartPhoto] = useState(null);
  const [completionOtp, setCompletionOtp] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  const normalizeWorkOrder = useCallback((booking) => {
    const serviceAddress = booking?.serviceAddress || {};
    const locationParts = [serviceAddress.street, serviceAddress.city, serviceAddress.state, serviceAddress.zipCode]
      .map(part => String(part || '').trim())
      .filter(Boolean);

    return {
      ...booking,
      userName: booking?.customerId?.name || booking?.userName || 'N/A',
      serviceName: booking?.serviceId?.name || booking?.serviceName || 'Service Booking',
      bookingDate: booking?.scheduledDate || booking?.bookingDate || null,
      bookingTime: booking?.scheduledTime || booking?.bookingTime || '',
      totalAmount: Number(booking?.price ?? booking?.totalAmount ?? 0),
      description: booking?.notes || booking?.description || '',
      location: locationParts.join(', '),
    };
  }, []);

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/bookings/professional/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const orders = Array.isArray(response.data?.bookings)
        ? response.data.bookings.map(normalizeWorkOrder)
        : [];
      setWorkOrders(orders);
      setError(null);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load work orders');
      } else {
        setWorkOrders([]);
      }
      console.error('Work orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [normalizeWorkOrder]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchWorkOrders();
  }, [navigate, fetchWorkOrders]);

  useEffect(() => {
    // inline filter logic to avoid missing dependency lint warnings
    let filtered = workOrders;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.userName?.toLowerCase().includes(search) ||
        order.serviceName?.toLowerCase().includes(search) ||
        order._id?.includes(search)
      );
    }

    setFilteredOrders(filtered);
  }, [workOrders, filterStatus, searchTerm]);

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'confirmed': '#17a2b8',
      'in-progress': '#007bff',
      'completed': '#28a745',
      'rejected': '#dc3545',
      'cancelled': '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'pending': '⏳',
      'confirmed': '✅',
      'in-progress': '🔄',
      'completed': '✓',
      'rejected': '⛔',
      'cancelled': '❌',
    };
    return icons[status] || '📋';
  };

  const handleStatusUpdate = async (orderId, newStatus, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/bookings/professional/${orderId}/status`,
        { status: newStatus, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedOrder = normalizeWorkOrder(response.data || {});
      
      // Update local state
      setWorkOrders(workOrders.map(order =>
        order._id === orderId ? updatedOrder : order
      ));
      
      setShowModal(false);
      setSelectedOrder(null);
      setCancelTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update work order');
    }
  };

  const openCancelDialog = (order) => {
    setActionMessage('');
    setShowModal(false);
    setCancelTarget(order);
  };

  const handleCallCustomer = async (bookingId) => {
    try {
      setActionMessage('');
      await startBookingAudioCall(bookingId);
    } catch (callError) {
      setActionMessage(callError.message || 'Unable to start call');
    }
  };

  const handleStartWork = async () => {
    if (!selectedOrder) return;
    if (!startOtp.trim()) {
      setActionMessage('Enter the start OTP before starting work.');
      return;
    }
    if (!startPhoto) {
      setActionMessage('Upload the start photo before starting work.');
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage('');

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('startOtp', startOtp.trim());
      formData.append('startPhoto', startPhoto);

      await axios.post(
        `${API_BASE_URL}/bookings/professional/${selectedOrder._id}/start`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setActionMessage('Work started successfully.');
      setStartOtp('');
      setStartPhoto(null);
      await fetchWorkOrders();
    } catch (startError) {
      setActionMessage(startError.response?.data?.message || 'Failed to start work');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrepareCompletion = async () => {
    if (!selectedOrder) return;
    if (!completionPhoto) {
      setActionMessage('Upload the final work image before generating the completion OTP.');
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage('');

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('endPhoto', completionPhoto);

      await axios.post(
        `${API_BASE_URL}/bookings/professional/${selectedOrder._id}/prepare-completion`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setActionMessage('Final OTP generated. Ask the customer to share it with you.');
      setCompletionPhoto(null);
      await fetchWorkOrders();
    } catch (completionError) {
      setActionMessage(completionError.response?.data?.message || 'Failed to generate completion OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!selectedOrder) return;
    if (!completionOtp.trim()) {
      setActionMessage('Enter the completion OTP to finish the work order.');
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage('');

      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/bookings/professional/${selectedOrder._id}/complete`,
        { completionOtp: completionOtp.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setActionMessage('Work order completed successfully.');
      setCompletionOtp('');
      await fetchWorkOrders();
    } catch (completeError) {
      setActionMessage(completeError.response?.data?.message || 'Failed to complete work order');
    } finally {
      setActionLoading(false);
    }
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setStartOtp('');
    setStartPhoto(null);
    setCompletionOtp('');
    setCompletionPhoto(null);
    setActionMessage('');
    setShowModal(true);
  };

  const closeOrderModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
    setStartOtp('');
    setStartPhoto(null);
    setCompletionOtp('');
    setCompletionPhoto(null);
    setActionMessage('');
  };

  if (loading) {
    return (
      <div className="work-orders-container">
        <div className="skeleton-loader">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-box"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="work-orders-container">
      <div className="page-header">
        <button 
          className="btn-back"
          onClick={() => navigate('/professional/dashboard')}
        >
          ← Back to Dashboard
        </button>
        <h1>📋 Work Orders</h1>
        <p className="subtitle">Manage all your service bookings and work orders</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Orders</span>
          <span className="stat-value">{workOrders.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value">{workOrders.filter(o => o.status === 'pending').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Confirmed</span>
          <span className="stat-value">{workOrders.filter(o => ['confirmed', 'accepted'].includes(o.status)).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{workOrders.filter(o => o.status === 'completed').length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input 
          type="text"
          placeholder="Search by client name, service, or order ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          {['all', 'pending', 'confirmed', 'in-progress', 'completed', 'rejected', 'cancelled'].map(status => (
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

      {/* Work Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="work-orders-list">
          {filteredOrders.map((order) => (
            <div key={order._id} className="work-order-card">
              <div className="order-header">
                <div className="order-title">
                  <span className="status-icon">{getStatusIcon(order.status)}</span>
                  <div>
                    <h3>{order.serviceName || 'Service Booking'}</h3>
                    <p className="order-id">Order ID: {order._id}</p>
                  </div>
                </div>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              <div className="order-content">
                <div className="order-section">
                  <h4>Client Information</h4>
                  <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">{order.userName || 'N/A'}</span>
                  </div>
                </div>

                <div className="order-section">
                  <h4>Booking Details</h4>
                  {order.bookingDate && (
                    <div className="info-row">
                      <span className="label">Date:</span>
                      <span className="value">{new Date(order.bookingDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  {order.bookingTime && (
                    <div className="info-row">
                      <span className="label">Time:</span>
                      <span className="value">{order.bookingTime}</span>
                    </div>
                  )}
                  {order.duration && (
                    <div className="info-row">
                      <span className="label">Duration:</span>
                      <span className="value">{order.duration} hours</span>
                    </div>
                  )}
                  {order.totalAmount && (
                    <div className="info-row amount">
                      <span className="label">Amount:</span>
                      <span className="value">₹{order.totalAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</span>
                    </div>
                  )}
                </div>

                {(order.feeBreakdown || order.commissionAmount) && (
                  <div className="order-section">
                    <h4>Fee Breakdown</h4>
                    <div className="info-row amount">
                      <span className="label">Service Charge:</span>
                      <span className="value">₹{Number(order.feeBreakdown?.serviceChargeAmount ?? order.totalAmount ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="info-row amount">
                      <span className="label">GST:</span>
                      <span className="value">₹{Number(order.feeBreakdown?.gstAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="info-row amount">
                      <span className="label">Cash Platform Charge:</span>
                      <span className="value">₹{Number(order.feeBreakdown?.platformChargeAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="info-row amount">
                      <span className="label">Commission:</span>
                      <span className="value">₹{Number(order.feeBreakdown?.commissionAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="info-row amount">
                      <span className="label">Professional Payout:</span>
                      <span className="value">₹{Number(order.feeBreakdown?.professionalPayoutAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}

                {order.description && (
                  <div className="order-section">
                    <h4>Description</h4>
                    <p className="description">{order.description}</p>
                  </div>
                )}

                {order.location && (
                  <div className="order-section">
                    <h4>Location</h4>
                    <p className="description">{order.location}</p>
                  </div>
                )}

                {order.cancelReason && (
                  <div className="order-section">
                    <h4>Cancellation Reason</h4>
                    <p className="description">{order.cancelReason}</p>
                  </div>
                )}

                {['confirmed', 'in-progress'].includes(String(order.status || '')) && (
                  <BookingRouteCard
                    title="Customer Location & Route"
                    originLocation={order.professionalId?.currentLocation}
                    destinationLocation={order.serviceAddress}
                    originLabel="Your current location"
                    destinationLabel="Customer location"
                  />
                )}
              </div>

              <div className="order-footer">
                <span className="created-date">
                  📅 Created: {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </span>
                {['pending', 'confirmed', 'in-progress'].includes(order.status) && (
                  <button
                    className="btn-action"
                    onClick={() => openOrderModal(order)}
                  >
                    {order.status === 'in-progress' ? 'Resume Completion' : 'Update Status'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>No Work Orders Found</h2>
          <p>
            {filterStatus === 'all' && searchTerm === ''
              ? 'You don\'t have any work orders yet.'
              : 'No work orders match your filters.'}
          </p>
        </div>
      )}

      {/* Status Update Modal */}
      {showModal && selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Update Work Order Status</h2>
            <p>Order: {selectedOrder.serviceName}</p>
            <p className="modal-subtitle">Current Status: <strong>{selectedOrder.status.toUpperCase()}</strong></p>

            {['confirmed', 'in-progress'].includes(selectedOrder.status) && (
              <div className="status-options">
                <button
                  type="button"
                  className="status-option accepted"
                  onClick={() => handleCallCustomer(selectedOrder._id)}
                  disabled={isCallBusy}
                >
                  📞 Call Customer
                </button>
              </div>
            )}
            {selectedOrder.status === 'confirmed' && (
              <div className="status-options">
                <div className="order-section" style={{ width: '100%' }}>
                  <h4>Start Work</h4>
                  <div className="info-row">
                    <span className="label">Start OTP:</span>
                    <input
                      type="text"
                      value={startOtp}
                      onChange={(event) => setStartOtp(event.target.value)}
                      placeholder="Enter the start OTP"
                      className="search-input"
                    />
                  </div>
                  <div className="info-row">
                    <span className="label">Start Photo:</span>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={{ fontSize: 13, color: '#5b6573' }}>
                        Choose from storage
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setStartPhoto(event.target.files?.[0] || null)}
                        />
                      </label>
                      <label style={{ fontSize: 13, color: '#5b6573' }}>
                        Capture with camera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(event) => setStartPhoto(event.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="status-option accepted"
                    onClick={handleStartWork}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Starting...' : 'Verify OTP & Start Work'}
                  </button>
                </div>
              </div>
            )}

            {selectedOrder.status === 'in-progress' && (
              <div className="status-options">
                <div className="order-section" style={{ width: '100%' }}>
                  <h4>Finish Work</h4>
                  <div className="info-row">
                    <span className="label">Final Work Image:</span>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <label style={{ fontSize: 13, color: '#5b6573' }}>
                        Choose from storage
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setCompletionPhoto(event.target.files?.[0] || null)}
                        />
                      </label>
                      <label style={{ fontSize: 13, color: '#5b6573' }}>
                        Capture with camera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(event) => setCompletionPhoto(event.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="status-option accepted"
                    onClick={handlePrepareCompletion}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Uploading...' : 'Upload Final Image & Generate OTP'}
                  </button>
                  <div className="info-row" style={{ marginTop: 12 }}>
                    <span className="label">Completion OTP:</span>
                    <input
                      type="text"
                      value={completionOtp}
                      onChange={(event) => setCompletionOtp(event.target.value)}
                      placeholder="Enter the final OTP"
                      className="search-input"
                    />
                  </div>
                  <button
                    type="button"
                    className="status-option accepted"
                    onClick={handleCompleteWork}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Completing...' : 'Verify Final OTP & Complete'}
                  </button>
                </div>
              </div>
            )}

            {actionMessage && <div className="alert alert-error">{actionMessage}</div>}

            <div className="status-options">
              {selectedOrder.status === 'pending' && (
                <>
                  <button
                    className="status-option accepted"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'confirmed')}
                  >
                    ✅ Confirm Order
                  </button>
                  <button
                    className="status-option cancelled"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'rejected')}
                  >
                    ❌ Reject Order
                  </button>
                  <button
                    className="status-option cancelled"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'cancelled')}
                  >
                    ⛔ Cancel Order
                  </button>
                </>
              )}

                {selectedOrder.status === 'confirmed' && (
                <>
                  <button
                    className="status-option cancelled"
                    onClick={() => openCancelDialog(selectedOrder)}
                  >
                    ❌ Cancel Order
                  </button>
                </>
              )}

              {selectedOrder.status === 'in-progress' && (
                <>
                  <p className="modal-subtitle">This order is already in progress. Completion is handled from the work-start workflow.</p>
                </>
              )}

              {selectedOrder.status === 'completed' && (
                <p className="modal-subtitle">This order is already completed.</p>
              )}
            </div>

            <button
              className="btn-close"
              onClick={closeOrderModal}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BookingCancelDialog
        isOpen={Boolean(cancelTarget)}
        title="Cancel Work Order"
        message="Enter a cancellation reason. This will be visible to the customer, admin, and your own order history."
        confirmLabel="Cancel Order"
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => handleStatusUpdate(cancelTarget?._id, 'cancelled', reason)}
      />
    </div>
  );
};

export default WorkOrdersPage;
