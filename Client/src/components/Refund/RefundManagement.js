import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RefundManagement.css';

const RefundManagement = ({ bookingId, paymentAmount, paymentId }) => {
  const [refunds, setRefunds] = useState([]);
  const [hasExistingRefund, setHasExistingRefund] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);

  const [formData, setFormData] = useState({
    reason: '',
    description: ''
  });

  const refundReasons = [
    { value: 'user_request', label: 'User Request' },
    { value: 'booking_cancelled', label: 'Booking Cancelled' },
    { value: 'professional_rejected', label: 'Professional Rejected' },
    { value: 'service_not_completed', label: 'Service Not Completed' },
    { value: 'customer_complaint', label: 'Customer Complaint' },
    { value: 'duplicate_payment', label: 'Duplicate Payment' }
  ];

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/wallet/my-refunds', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRefunds(response.data || []);
      
      // Check if there's already a refund for this booking
      if (paymentId) {
        const existingRefund = response.data?.find(r => r.paymentId === paymentId);
        setHasExistingRefund(!!existingRefund);
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.reason) {
      setError('Please select a reason');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Please provide a description');
      return false;
    }
    if (formData.description.length < 10) {
      setError('Description must be at least 10 characters');
      return false;
    }
    return true;
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      await axios.post('/api/refund/request',
        {
          paymentId,
          bookingId,
          reason: formData.reason,
          description: formData.description,
          refundAmount: paymentAmount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Refund request submitted successfully!');
      setFormData({ reason: '', description: '' });
      setShowForm(false);
      setError(null);
      
      // Refresh refunds list
      fetchRefunds();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    return `status-badge status-${status}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="refund-management">
        <div className="skeleton-loader">
          <div className="skeleton-box"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="refund-management">
      <div className="header">
        <h3>↩️ Refund Management</h3>
        {!hasExistingRefund && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
            disabled={submitting}
          >
            Request Refund
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Refund Request Form */}
      {showForm && (
        <div className="refund-form-container">
          <form onSubmit={handleSubmitRefund} className="refund-form">
            <div className="form-group">
              <label htmlFor="reason">Refund Reason *</label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                disabled={submitting}
              >
                <option value="">Select a reason</option>
                {refundReasons.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Please explain why you want to request a refund"
                rows="4"
                required
                disabled={submitting}
              />
              <small>Minimum 10 characters required</small>
            </div>

            <div className="refund-amount-info">
              <p>Refund Amount: <strong>₹{paymentAmount?.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</strong></p>
              <p className="note">Processing time: 3-5 business days</p>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Refund Request'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ reason: '', description: '' });
                }}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Refunds List */}
      {refunds && refunds.length > 0 && (
        <div className="refunds-section">
          <h4>Refund Requests</h4>
          <div className="refunds-list">
            {refunds.map(refund => (
              <div key={refund._id} className="refund-card">
                <div className="refund-header">
                  <div className="refund-amount">
                    ₹{refund.refundAmount?.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className={getStatusBadgeClass(refund.status)}>
                    {refund.status?.toUpperCase()}
                  </div>
                </div>
                <div className="refund-details">
                  <p><strong>Reason:</strong> {refund.reason?.replace(/_/g, ' ').toUpperCase()}</p>
                  <p><strong>Request Date:</strong> {formatDate(refund.createdAt)}</p>
                  {refund.approvedAt && (
                    <p><strong>Approved Date:</strong> {formatDate(refund.approvedAt)}</p>
                  )}
                  {refund.approvalNotes && (
                    <p><strong>Notes:</strong> {refund.approvalNotes}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRefund(selectedRefund === refund._id ? null : refund._id)}
                  className="btn-expand"
                >
                  {selectedRefund === refund._id ? 'Hide' : 'View'} Details
                </button>
                {selectedRefund === refund._id && (
                  <div className="refund-expanded">
                    <p><strong>Description:</strong> {refund.description}</p>
                    {refund.status === 'rejected' && (
                      <div className="rejection-notice">
                        <p className="rejection-reason">{refund.approvalNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!showForm && refunds.length === 0 && (
        <div className="empty-state">
          <p>No refund requests yet</p>
          <p className="note">Submit a refund request if you need to process a refund</p>
        </div>
      )}

      {/* Info Box */}
      <div className="info-box">
        <h4>ℹ️ Refund Policy</h4>
        <ul>
          <li>Refund requests must be submitted within 30 days</li>
          <li>Processing time: 3-5 business days</li>
          <li>Refunds will be credited to your original payment method</li>
          <li>Commission charges are reversible upon refund approval</li>
          <li>Admin review is required for all refund requests</li>
        </ul>
      </div>
    </div>
  );
};

export default RefundManagement;
