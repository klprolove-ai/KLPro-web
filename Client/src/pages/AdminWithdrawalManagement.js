import React, { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config/apiConfig';
import './AdminWithdrawalManagement.css';

function AdminWithdrawalManagement({ isEmbedded = false }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [selectedBankDetails, setSelectedBankDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [page, setPage] = useState(1);

  const token = localStorage.getItem('adminToken');

  // Fetch withdrawals
  const fetchWithdrawals = useCallback(async (status = 'pending', pageNum = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/admin-wallet/withdrawals/pending?status=${status}&page=${pageNum}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch withdrawals');
      const data = await response.json();
      setWithdrawals(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin-wallet/withdrawals/summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    fetchWithdrawals(currentTab, page);
    fetchSummary();
  }, [currentTab, page, token, fetchWithdrawals, fetchSummary]);

  // Approve withdrawal
  const handleApprove = async () => {
    if (!selectedWithdrawal) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/admin-wallet/withdrawals/${selectedWithdrawal._id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes: actionNotes }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      alert('Withdrawal approved successfully');
      setSelectedWithdrawal(null);
      setSelectedBankDetails(null);
      setActionNotes('');
      fetchWithdrawals(currentTab, page);
      fetchSummary();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject withdrawal
  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      alert('Please enter rejection reason');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/admin-wallet/withdrawals/${selectedWithdrawal._id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectionReason }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      alert('Withdrawal rejected and amount refunded');
      setSelectedWithdrawal(null);
      setSelectedBankDetails(null);
      setRejectionReason('');
      fetchWithdrawals(currentTab, page);
      fetchSummary();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Complete withdrawal
  const handleComplete = async () => {
    if (!selectedWithdrawal) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/admin-wallet/withdrawals/${selectedWithdrawal._id}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ transactionReference: transactionRef }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      alert('Withdrawal marked as completed');
      setSelectedWithdrawal(null);
      setSelectedBankDetails(null);
      setTransactionRef('');
      fetchWithdrawals(currentTab, page);
      fetchSummary();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'processing':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'failed':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getProfessionalUser = (withdrawal) => withdrawal?.professionalId?.userId || null;
  const getProfessionalName = (withdrawal) => getProfessionalUser(withdrawal)?.name || withdrawal?.professionalId?.name || 'Unknown';
  const getProfessionalEmail = (withdrawal) => getProfessionalUser(withdrawal)?.email || withdrawal?.professionalId?.email || 'N/A';
  const getProfessionalPhone = (withdrawal) => getProfessionalUser(withdrawal)?.phone || withdrawal?.professionalId?.phone || 'N/A';

  return (
    <div className={isEmbedded ? 'withdrawal-management-content' : 'admin-withdrawal-container'}>
      {!isEmbedded && (
        <div className="withdrawal-header">
          <h1>💰 Withdrawal Management</h1>
          <p>Manage professional withdrawal requests</p>
        </div>
      )}

      {isEmbedded && (
        <div className="users-header">
          <h2>💰 Withdrawal Management</h2>
          <p>Manage professional withdrawal requests and approvals</p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card pending">
            <div className="card-value">{summary.pending?.count || 0}</div>
            <div className="card-label">Pending</div>
            <div className="card-amount">₹{(summary.pending?.amount || 0).toLocaleString()}</div>
          </div>
          <div className="summary-card processing">
            <div className="card-value">{summary.processing?.count || 0}</div>
            <div className="card-label">Processing</div>
            <div className="card-amount">₹{(summary.processing?.amount || 0).toLocaleString()}</div>
          </div>
          <div className="summary-card completed">
            <div className="card-value">{summary.completed || 0}</div>
            <div className="card-label">Completed</div>
          </div>
          <div className="summary-card failed">
            <div className="card-value">{summary.failed || 0}</div>
            <div className="card-label">Failed</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="withdrawal-tabs">
        {['pending', 'processing', 'completed', 'failed'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${currentTab === tab ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab(tab);
              setPage(1);
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Withdrawals List */}
      <div className="withdrawals-list">
        {loading ? (
          <div className="loading">Loading withdrawals...</div>
        ) : withdrawals.length === 0 ? (
          <div className="empty-state">No {currentTab} withdrawals</div>
        ) : (
          withdrawals.map((withdrawal) => (
            <div
              key={withdrawal._id}
              className="withdrawal-card"
              onClick={() => {
                setSelectedWithdrawal(withdrawal);
                setSelectedBankDetails(withdrawal.withdrawalDetails?.bankDetailsId || null);
              }}
            >
              <div className="withdrawal-header-card">
                <div>
                  <h3>{getProfessionalName(withdrawal)}</h3>
                  <p>{getProfessionalEmail(withdrawal)}</p>
                </div>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(withdrawal.status) }}
                >
                  {withdrawal.status}
                </span>
              </div>
              <div className="withdrawal-details-grid">
                <div>
                  <span className="label">Amount:</span>
                  <span className="value">₹{withdrawal.amount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="label">Method:</span>
                  <span className="value">{withdrawal.withdrawalDetails?.method}</span>
                </div>
                <div>
                  <span className="label">Date:</span>
                  <span className="value">{new Date(withdrawal.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedWithdrawal && (
        <div className="modal-overlay" onClick={() => {
              setSelectedWithdrawal(null);
              setSelectedBankDetails(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Withdrawal Details</h2>
              <button className="close-btn" onClick={() => {
                  setSelectedWithdrawal(null);
                  setSelectedBankDetails(null);
              }}>
                ✕
              </button>
            </div>

            <div className="detail-section">
              <h3>Professional Information</h3>
              <div className="detail-grid">
                <div>
                  <span className="label">Name:</span>
                  <span className="value">{getProfessionalName(selectedWithdrawal)}</span>
                </div>
                <div>
                  <span className="label">Email:</span>
                  <span className="value">{getProfessionalEmail(selectedWithdrawal)}</span>
                </div>
                <div>
                  <span className="label">Phone:</span>
                  <span className="value">{getProfessionalPhone(selectedWithdrawal)}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Withdrawal Details</h3>
              <div className="detail-grid">
                <div>
                  <span className="label">Amount:</span>
                  <span className="value">₹{selectedWithdrawal.amount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="label">Method:</span>
                  <span className="value">{selectedWithdrawal.withdrawalDetails?.method}</span>
                </div>
                <div>
                  <span className="label">Status:</span>
                  <span
                    className="value"
                    style={{ color: getStatusColor(selectedWithdrawal.status) }}
                  >
                    {selectedWithdrawal.status}
                  </span>
                </div>
                <div>
                  <span className="label">Requested On:</span>
                  <span className="value">{new Date(selectedWithdrawal.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {selectedBankDetails && selectedWithdrawal.withdrawalDetails?.method && (
              <div className="detail-section">
                <h3>
                  {selectedWithdrawal.withdrawalDetails.method === 'upi'
                    ? '📱 UPI Details'
                    : selectedWithdrawal.withdrawalDetails.method === 'net_banking'
                      ? '🌐 Net Banking Details'
                      : '🏦 Bank Details'}
                </h3>
                <div className="detail-grid">
                  {selectedWithdrawal.withdrawalDetails.method === 'upi' ? (
                    <>
                      <div>
                        <span className="label">UPI ID:</span>
                        <span className="value">{selectedBankDetails.upiId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="label">Account Holder:</span>
                        <span className="value">{selectedBankDetails.accountHolderName || 'N/A'}</span>
                      </div>
                    </>
                  ) : selectedWithdrawal.withdrawalDetails.method === 'net_banking' ? (
                    <>
                      <div>
                        <span className="label">Account Holder:</span>
                        <span className="value">{selectedBankDetails.accountHolderName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="label">Bank Name:</span>
                        <span className="value">{selectedBankDetails.bankName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="label">Branch:</span>
                        <span className="value">{selectedBankDetails.branchName || 'N/A'}</span>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className="label">Net Banking Details:</span>
                        <div className="value" style={{ marginTop: '6px' }}>
                          {Array.isArray(selectedBankDetails.paymentMethods)
                            ? selectedBankDetails.paymentMethods
                                .filter((method) => String(method?.methodType || '').toLowerCase() === 'net_banking')
                                .map((method, index) => (
                                  <div key={index} style={{ marginBottom: '6px' }}>
                                    {method.details || 'N/A'}
                                  </div>
                                ))
                            : 'N/A'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="label">Account Holder:</span>
                        <span className="value">{selectedBankDetails.accountHolderName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="label">Bank Name:</span>
                        <span className="value">{selectedBankDetails.bankName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="label">Account Number:</span>
                        <span className="value">{selectedBankDetails.accountNumber ? `****${selectedBankDetails.accountNumber.slice(-4)}` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="label">IFSC Code:</span>
                        <span className="value">{selectedBankDetails.ifscCode || 'N/A'}</span>
                      </div>
                      {Array.isArray(selectedBankDetails.paymentMethods) && selectedBankDetails.paymentMethods.length > 0 && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span className="label">Available Payment Methods:</span>
                          <div className="methods-list" style={{ marginTop: '8px' }}>
                            {selectedBankDetails.paymentMethods.map((method, index) => (
                              <div key={index} style={{ marginBottom: '10px' }}>
                                <strong>{method.methodType || 'method'}</strong>
                                {method.details ? <div>{method.details}</div> : null}
                                <div>{method.isActive ? 'Active' : 'Inactive'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {selectedWithdrawal.withdrawalDetails?.transactionId && (
              <div className="detail-section">
                <h3>✅ Transaction Reference</h3>
                <div className="detail-grid">
                  <div>
                    <span className="label">Reference ID:</span>
                    <span className="value">{selectedWithdrawal.withdrawalDetails.transactionId}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedWithdrawal.status === 'pending' && (
              <div className="action-section">
                <div className="form-group">
                  <label>Notes (Optional):</label>
                  <textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Add any notes..."
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Rejection Reason (if rejecting):</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason for rejection..."
                    rows="3"
                  />
                </div>

                <div className="button-group">
                  <button
                    className="btn btn-approve"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? '...' : '✓ Approve'}
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? '...' : '✕ Reject'}
                  </button>
                </div>
              </div>
            )}

            {selectedWithdrawal.status === 'processing' && (
              <div className="action-section">
                <div className="form-group">
                  <label>Transaction Reference (Optional):</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Bank/UPI transaction ID..."
                  />
                </div>

                <div className="button-group">
                  <button
                    className="btn btn-complete"
                    onClick={handleComplete}
                    disabled={actionLoading}
                  >
                    {actionLoading ? '...' : '✓ Mark as Completed'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminWithdrawalManagement;
