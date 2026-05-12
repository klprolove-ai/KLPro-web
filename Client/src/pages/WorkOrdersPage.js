import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import './WorkOrdersPage.css';

const WorkOrdersPage = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchWorkOrders();
  }, [navigate]);

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
        order.userEmail?.toLowerCase().includes(search) ||
        order.serviceName?.toLowerCase().includes(search) ||
        order._id?.includes(search)
      );
    }

    setFilteredOrders(filtered);
  }, [workOrders, filterStatus, searchTerm]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/bookings/professional`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const orders = response.data?.data || [];
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

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/bookings/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setWorkOrders(workOrders.map(order =>
        order._id === orderId ? { ...order, status: newStatus } : order
      ));
      
      setShowModal(false);
      setSelectedOrder(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update work order');
    }
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
          <span className="stat-label">In Progress</span>
          <span className="stat-value">{workOrders.filter(o => o.status === 'in-progress').length}</span>
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
          placeholder="Search by client name, email, service, or order ID..."
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
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <span className="value">{order.userEmail || 'N/A'}</span>
                  </div>
                  {order.userPhone && (
                    <div className="info-row">
                      <span className="label">Phone:</span>
                      <span className="value">{order.userPhone}</span>
                    </div>
                  )}
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
              </div>

              <div className="order-footer">
                <span className="created-date">
                  📅 Created: {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </span>
                {['pending', 'accepted'].includes(order.status) && (
                  <button
                    className="btn-action"
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowModal(true);
                    }}
                  >
                    Update Status
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Update Work Order Status</h2>
            <p>Order: {selectedOrder.serviceName}</p>
            <p className="modal-subtitle">Current Status: <strong>{selectedOrder.status.toUpperCase()}</strong></p>

            <div className="status-options">
              {selectedOrder.status === 'pending' && (
                <>
                  <button
                    className="status-option accepted"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'accepted')}
                  >
                    ✅ Accept Order
                  </button>
                  <button
                    className="status-option cancelled"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'cancelled')}
                  >
                    ❌ Cancel Order
                  </button>
                </>
              )}

              {selectedOrder.status === 'accepted' && (
                <>
                  <button
                    className="status-option in-progress"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'in-progress')}
                  >
                    🔄 Mark as In Progress
                  </button>
                  <button
                    className="status-option cancelled"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'cancelled')}
                  >
                    ❌ Cancel Order
                  </button>
                </>
              )}

              {selectedOrder.status === 'in-progress' && (
                <>
                  <button
                    className="status-option completed"
                    onClick={() => handleStatusUpdate(selectedOrder._id, 'completed')}
                  >
                    ✓ Mark as Completed
                  </button>
                </>
              )}
            </div>

            <button
              className="btn-close"
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrdersPage;
