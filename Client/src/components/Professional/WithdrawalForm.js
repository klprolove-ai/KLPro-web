import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './WithdrawalForm.css';

const WithdrawalForm = () => {
  const [wallet, setWallet] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    method: 'bank_transfer'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const MIN_WITHDRAWAL = 100;
  const PROCESSING_TIME = '2-3 business days';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [walletRes, bankRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/wallet/details`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/wallet/bank-details`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null }))
      ]);

      setWallet(walletRes.data);
      setBankDetails(bankRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wallet data');
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
    if (!formData.amount) {
      setError('Please enter withdrawal amount');
      return false;
    }

    const amount = parseFloat(formData.amount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (amount < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);
      return false;
    }

    if (amount > wallet.currentBalance) {
      setError('Insufficient balance');
      return false;
    }

    if (!bankDetails || bankDetails.verificationStatus !== 'verified') {
      setError('Please verify your bank details first');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setShowConfirm(true);
  };

  const confirmWithdrawal = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      await axios.post('/api/wallet/initiate-withdrawal', 
        {
          amount: parseFloat(formData.amount),
          method: formData.method
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Withdrawal request submitted! Processing time: ${PROCESSING_TIME}`);
      setFormData({ amount: '', method: 'bank_transfer' });
      setShowConfirm(false);
      setError(null);
      
      // Refresh wallet data
      fetchData();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="withdrawal-container">
        <div className="skeleton-loader">
          <div className="skeleton-box"></div>
        </div>
      </div>
    );
  }

  if (!bankDetails || bankDetails.verificationStatus !== 'verified') {
    return (
      <div className="withdrawal-container">
        <div className="warning-card">
          <h3>⚠️ Bank Details Not Verified</h3>
          <p>Your bank details need to be verified before you can withdraw funds.</p>
          <a href="/professional/bank-details" className="btn btn-primary">
            Verify Bank Details
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="withdrawal-container">
      <div className="header">
        <h2>🏦 Request Withdrawal</h2>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="withdrawal-form">
        {/* Available Balance */}
        <div className="balance-info">
          <div className="balance-item">
            <span className="label">Available Balance:</span>
            <span className="value">
              ₹{wallet.currentBalance?.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          <div className="balance-item">
            <span className="label">Minimum Withdrawal:</span>
            <span className="value">₹{MIN_WITHDRAWAL}</span>
          </div>
          <div className="balance-item">
            <span className="label">Processing Time:</span>
            <span className="value">{PROCESSING_TIME}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="form-group">
          <label htmlFor="amount">Withdrawal Amount *</label>
          <div className="amount-input-wrapper">
            <span className="currency">₹</span>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min={MIN_WITHDRAWAL}
              max={wallet.currentBalance}
              required
              disabled={submitting || showConfirm}
            />
          </div>
          {formData.amount && (
            <small className="amount-info">
              You will receive: ₹{(parseFloat(formData.amount) || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </small>
          )}
        </div>

        {/* Withdrawal Method */}
        <div className="form-group">
          <label htmlFor="method">Withdrawal Method *</label>
          <select
            id="method"
            name="method"
            value={formData.method}
            onChange={handleChange}
            required
            disabled={submitting || showConfirm}
          >
            <option value="bank_transfer">Bank Transfer</option>
            {bankDetails?.paymentMethods?.includes('upi') && (
              <option value="upi">UPI</option>
            )}
            {bankDetails?.paymentMethods?.includes('net_banking') && (
              <option value="net_banking">Net Banking</option>
            )}
          </select>
          <small>
            {formData.method === 'bank_transfer' && 'Transfer to bank account ending with ' + bankDetails?.accountNumber?.slice(-4)}
            {formData.method === 'upi' && 'Transfer to UPI: ' + bankDetails?.upiId}
            {formData.method === 'net_banking' && 'Through net banking'}
          </small>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting || showConfirm || !formData.amount}
          >
            {submitting ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Withdrawal</h3>
            <div className="confirmation-details">
              <p>
                You are requesting a withdrawal of <strong>₹{parseFloat(formData.amount).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</strong>
              </p>
              <p>Method: <strong>{formData.method.replace('_', ' ').toUpperCase()}</strong></p>
              <p className="processing-note">
                Processing time: <strong>{PROCESSING_TIME}</strong>
              </p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={confirmWithdrawal}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="info-box">
        <h4>📋 Withdrawal Information</h4>
        <ul>
          <li>Minimum withdrawal amount: ₹{MIN_WITHDRAWAL}</li>
          <li>Processing time: {PROCESSING_TIME}</li>
          <li>Withdrawals are processed Monday-Friday</li>
          <li>Bank verification is required</li>
          <li>You can track your withdrawal status in withdrawal history</li>
        </ul>
      </div>

      {/* Withdrawal History Link */}
      <div className="action-link">
        <a href="/professional/withdrawals">View Withdrawal History →</a>
      </div>
    </div>
  );
};

export default WithdrawalForm;
