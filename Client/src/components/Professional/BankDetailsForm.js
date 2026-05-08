import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './BankDetails.css';

const BankDetailsForm = () => {
  const [formData, setFormData] = useState({
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    paymentMethods: []
  });
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const maskedAccountNumber = String(bankDetails?.accountNumber || '');
  const maskedAccountSuffix = maskedAccountNumber ? maskedAccountNumber.slice(-4) : '----';
  const verificationStatus = String(bankDetails?.verificationStatus || 'pending');

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/wallet/bank-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.data) {
        setBankDetails(response.data.data);
        setFormData({
          accountNumber: response.data.data.accountNumber || '',
          ifscCode: response.data.data.ifscCode || '',
          upiId: response.data.data.upiId || '',
          paymentMethods: response.data.data.paymentMethods || []
        });
        setIsEditing(false);
      }
      setError(null);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load bank details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        paymentMethods: checked
          ? [...prev.paymentMethods, value]
          : prev.paymentMethods.filter(method => method !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    if (!formData.accountNumber.trim()) {
      setError('Account number is required');
      return false;
    }
    if (!formData.ifscCode.trim()) {
      setError('IFSC code is required');
      return false;
    }
    if (formData.accountNumber.length < 9 || formData.accountNumber.length > 18) {
      setError('Invalid account number (9-18 digits)');
      return false;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      setError('Invalid IFSC code format');
      return false;
    }
    if (formData.paymentMethods.length === 0) {
      setError('Please select at least one payment method');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/wallet/bank-details`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBankDetails(response.data);
      setSuccess('Bank details saved successfully!');
      setIsEditing(false);
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save bank details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bank-details-container">
        <div className="skeleton-loader">
          <div className="skeleton-box"></div>
          <div className="skeleton-box"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bank-details-container">
      <div className="header">
        <h2>💳 Bank Account Details</h2>
        {bankDetails && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="btn btn-secondary"
          >
            Edit
          </button>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {bankDetails && !isEditing ? (
        <div className="bank-details-display">
          <div className="detail-row">
            <span className="label">Account Number:</span>
            <span className="value">****{maskedAccountSuffix}</span>
          </div>
          <div className="detail-row">
            <span className="label">IFSC Code:</span>
            <span className="value">{bankDetails.ifscCode}</span>
          </div>
          {bankDetails.upiId && (
            <div className="detail-row">
              <span className="label">UPI ID:</span>
              <span className="value">{bankDetails.upiId}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="label">Status:</span>
            <span className={`status-badge ${verificationStatus}`}>
              {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Payment Methods:</span>
            <div className="methods-list">
              {bankDetails.paymentMethods?.map(method => (
                <span key={method} className="method-badge">{method}</span>
              ))}
            </div>
          </div>
          <div className="detail-row">
            <span className="label">Last Updated:</span>
            <span className="value">{new Date(bankDetails.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bank-form">
          <div className="form-group">
            <label htmlFor="accountNumber">Account Number *</label>
            <input
              type="text"
              id="accountNumber"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="Enter your account number"
              required
              disabled={submitting}
            />
            <small>Enter the 9-18 digit account number</small>
          </div>

          <div className="form-group">
            <label htmlFor="ifscCode">IFSC Code *</label>
            <input
              type="text"
              id="ifscCode"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              placeholder="e.g., HDFC0000001"
              maxLength="11"
              required
              disabled={submitting}
              style={{ textTransform: 'uppercase' }}
            />
            <small>Format: ABCD0123456</small>
          </div>

          <div className="form-group">
            <label htmlFor="upiId">UPI ID (Optional)</label>
            <input
              type="text"
              id="upiId"
              name="upiId"
              value={formData.upiId}
              onChange={handleChange}
              placeholder="e.g., yourname@bank"
              disabled={submitting}
            />
            <small>For UPI-based withdrawals</small>
          </div>

          <div className="form-group">
            <label>Preferred Payment Methods *</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value="bank_transfer"
                  checked={formData.paymentMethods.includes('bank_transfer')}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <span>Bank Transfer</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value="upi"
                  checked={formData.paymentMethods.includes('upi')}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <span>UPI</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value="net_banking"
                  checked={formData.paymentMethods.includes('net_banking')}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <span>Net Banking</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Bank Details'}
            </button>
            {isEditing && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    accountNumber: bankDetails?.accountNumber || '',
                    ifscCode: bankDetails?.ifscCode || '',
                    upiId: bankDetails?.upiId || '',
                    paymentMethods: bankDetails?.paymentMethods || []
                  });
                }}
                disabled={submitting}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="info-box">
        <h4>ℹ️ Information</h4>
        <ul>
          <li>Your bank details are securely stored and encrypted</li>
          <li>Verification may take up to 24 hours</li>
          <li>Only verified accounts can process withdrawals</li>
          <li>You can update your details anytime</li>
        </ul>
      </div>
    </div>
  );
};

export default BankDetailsForm;
