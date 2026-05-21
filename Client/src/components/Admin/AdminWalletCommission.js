import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './AdminWalletCommission.css';

const AdminWalletCommission = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProf, setSelectedProf] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProfessionalsWithWallets();
  }, []);

  const fetchProfessionalsWithWallets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_BASE_URL}/admin-wallet/professional-earnings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data) {
        setProfessionals(response.data.data.professionals || []);
      } else {
        setProfessionals([]);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching professionals:', err);
      setError('Failed to load professionals list');
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeductClick = (professional) => {
    setSelectedProf(professional);
    setDeductAmount('');
    setDeductReason('');
    setShowModal(true);
  };

  const handleConfirmDeduction = async () => {
    if (!selectedProf) return;

    if (!deductAmount || parseFloat(deductAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!deductReason.trim()) {
      setError('Please provide a reason for deduction');
      return;
    }

    // Check if amount exceeds balance
    if (parseFloat(deductAmount) > selectedProf.currentBalance) {
      setError(`Amount exceeds available balance (₹${selectedProf.currentBalance})`);
      return;
    }

    try {
      setProcessing(true);
      setError('');
      const token = localStorage.getItem('adminToken');

      const response = await axios.post(
        `${API_BASE_URL}/admin-wallet/debit-wallet`,
        {
          professionalId: selectedProf._id || selectedProf.professionalId,
          amount: parseFloat(deductAmount),
          reason: deductReason,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccessMessage(`Successfully deducted ₹${deductAmount} from ${selectedProf.name}`);
        
        // Update local state
        const updatedProfs = professionals.map((p) => {
          if (
            p._id === selectedProf._id ||
            p.professionalId === selectedProf.professionalId
          ) {
            return {
              ...p,
              currentBalance: p.currentBalance - parseFloat(deductAmount),
            };
          }
          return p;
        });
        setProfessionals(updatedProfs);

        // Close modal and reset
        setShowModal(false);
        setSelectedProf(null);
        setDeductAmount('');
        setDeductReason('');

        // Clear success message after 4 seconds
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Error deducting commission:', err);
      setError(
        err.response?.data?.message || 'Failed to deduct commission'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProf(null);
    setDeductAmount('');
    setDeductReason('');
    setError('');
  };

  const filteredProfessionals = professionals.filter((prof) =>
    prof.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading-spinner">Loading professionals...</div>;
  }

  return (
    <div className="admin-wallet-commission-container">
      <div className="section-header">
        <h2>💸 Commission Management</h2>
        <p className="section-subtitle">Deduct commissions and manage professional wallets</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {filteredProfessionals.length === 0 ? (
        <div className="empty-state">
          <p>📋 No professionals found</p>
          {searchTerm && <p className="empty-subtitle">Try adjusting your search</p>}
        </div>
      ) : (
        <>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="professionals-grid">
            {filteredProfessionals.map((prof) => (
              <div key={prof._id || prof.professionalId} className="professional-card">
                <div className="card-header">
                  <h3>{prof.name || 'Professional'}</h3>
                  <span className="status-badge">
                    {prof.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <span className="value">{prof.email}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Phone:</span>
                    <span className="value">{prof.phone || '-'}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Service:</span>
                    <span className="value">{prof.serviceName || prof.category || '-'}</span>
                  </div>

                  <div className="wallet-info">
                    <div className="wallet-stat">
                      <span className="stat-label">Current Balance</span>
                      <span className="stat-value">₹{prof.currentBalance?.toFixed(2) || '0'}</span>
                    </div>

                    <div className="wallet-stat">
                      <span className="stat-label">Total Earnings</span>
                      <span className="stat-value">₹{prof.totalEarnings?.toFixed(2) || '0'}</span>
                    </div>

                    <div className="wallet-stat">
                      <span className="stat-label">Commission Paid</span>
                      <span className="stat-value">₹{prof.totalCommissionPaid?.toFixed(2) || '0'}</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <button
                    className="btn btn-deduct"
                    onClick={() => handleDeductClick(prof)}
                    disabled={prof.currentBalance <= 0}
                    title={
                      prof.currentBalance <= 0
                        ? 'Insufficient balance'
                        : 'Deduct commission from wallet'
                    }
                  >
                    💸 Deduct Commission
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal for commission deduction */}
      {showModal && selectedProf && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💸 Deduct Commission</h3>
            </div>

            <div className="modal-body">
              <div className="professional-summary">
                <h4>{selectedProf.name}</h4>
                <p className="email">{selectedProf.email}</p>
                <div className="balance-info">
                  <strong>Current Balance:</strong> ₹{selectedProf.currentBalance?.toFixed(2)}
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleConfirmDeduction(); }}>
                <div className="form-group">
                  <label htmlFor="deductAmount">Amount (₹) *</label>
                  <input
                    id="deductAmount"
                    type="number"
                    className="form-control"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={selectedProf.currentBalance}
                    disabled={processing}
                  />
                  <small className="help-text">
                    Available: ₹{selectedProf.currentBalance?.toFixed(2)}
                  </small>
                </div>

                <div className="form-group">
                  <label>Fee Type Breakdown *</label>
                  <div style={{display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                      <input
                        type="checkbox"
                        checked={deductReason.includes('Commission')}
                        onChange={(e) => {
                          if (e.target.checked && !deductReason.includes('Commission')) {
                            setDeductReason(deductReason ? deductReason + ', Commission' : 'Commission');
                          } else if (!e.target.checked && deductReason.includes('Commission')) {
                            setDeductReason(deductReason.replace(', Commission', '').replace('Commission, ', '').replace('Commission', ''));
                          }
                        }}
                        disabled={processing}
                      />
                      Commission
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                      <input
                        type="checkbox"
                        checked={deductReason.includes('GST')}
                        onChange={(e) => {
                          if (e.target.checked && !deductReason.includes('GST')) {
                            setDeductReason(deductReason ? deductReason + ', GST' : 'GST');
                          } else if (!e.target.checked && deductReason.includes('GST')) {
                            setDeductReason(deductReason.replace(', GST', '').replace('GST, ', '').replace('GST', ''));
                          }
                        }}
                        disabled={processing}
                      />
                      GST Tax
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                      <input
                        type="checkbox"
                        checked={deductReason.includes('Platform Charge')}
                        onChange={(e) => {
                          if (e.target.checked && !deductReason.includes('Platform Charge')) {
                            setDeductReason(deductReason ? deductReason + ', Platform Charge' : 'Platform Charge');
                          } else if (!e.target.checked && deductReason.includes('Platform Charge')) {
                            setDeductReason(deductReason.replace(', Platform Charge', '').replace('Platform Charge, ', '').replace('Platform Charge', ''));
                          }
                        }}
                        disabled={processing}
                      />
                      Platform Charge
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="deductReason">Additional Notes</label>
                  <textarea
                    id="deductReason"
                    className="form-control"
                    value={deductReason}
                    onChange={(e) => setDeductReason(e.target.value)}
                    placeholder="Add any additional notes (optional)"
                    rows="3"
                    disabled={processing}
                  />
                </div>

                <div className="form-summary">
                  <div className="summary-row">
                    <span>Amount to Deduct:</span>
                    <strong>₹{deductAmount || '0'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>New Balance:</span>
                    <strong>
                      ₹{deductAmount
                        ? (selectedProf.currentBalance - parseFloat(deductAmount)).toFixed(2)
                        : selectedProf.currentBalance?.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-cancel"
                onClick={handleCloseModal}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn btn-confirm-deduct"
                onClick={handleConfirmDeduction}
                disabled={processing || !deductAmount || !deductReason}
              >
                {processing ? 'Processing...' : 'Confirm Deduction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWalletCommission;
