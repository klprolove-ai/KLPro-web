import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './AdminBankDetailsVerification.css';

const AdminBankDetailsVerification = () => {
  const [bankDetails, setBankDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'verify' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPendingBankDetails();
  }, []);

  const fetchPendingBankDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/admin-wallet/bank-details/pending?status=pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data) {
        setBankDetails(response.data.data.bankDetails || []);
      } else {
        setBankDetails([]);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching bank details:', err);
      setError('Failed to load bank details');
      setBankDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return '****';
    const str = accountNumber.toString();
    const lastFour = str.slice(-4);
    return `****${lastFour}`;
  };

  const getProfessionalName = (details) => {
    return (
      details?.professionalId?.userId?.name ||
      details?.professionalId?.name ||
      details?.userId?.name ||
      details?.accountHolderName ||
      'N/A'
    );
  };

  const handleVerifyClick = (details) => {
    setSelectedDetails(details);
    setActionType('verify');
    setRejectionReason('');
    setShowModal(true);
  };

  const handleRejectClick = (details) => {
    setSelectedDetails(details);
    setActionType('reject');
    setRejectionReason('');
    setShowModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedDetails) return;

    if (actionType === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken') || localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE_URL}/admin-wallet/bank-details/verify`,
        {
          bankDetailsId: selectedDetails._id,
          status: actionType === 'verify' ? 'verified' : 'rejected',
          rejectionReason: rejectionReason || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccessMessage(
          actionType === 'verify'
            ? 'Bank details verified successfully'
            : 'Bank details rejected successfully'
        );
        
        // Refresh the list
        await fetchPendingBankDetails();
        
        // Close modal and reset
        setShowModal(false);
        setSelectedDetails(null);
        setActionType('');
        setRejectionReason('');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error processing bank details:', err);
      setError(
        err.response?.data?.message || 'Failed to process bank details'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDetails(null);
    setActionType('');
    setRejectionReason('');
  };

  if (loading) {
    return <div className="loading-spinner">Loading bank details...</div>;
  }

  return (
    <div className="admin-bank-details-container">
      <div className="section-header">
        <h2>🏦 Bank Details Verification</h2>
        <p className="section-subtitle">Review and verify professional bank accounts</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {bankDetails.length === 0 ? (
        <div className="empty-state">
          <p>✓ All bank details have been verified!</p>
          <p className="empty-subtitle">No pending verifications at this time</p>
        </div>
      ) : (
        <div className="bank-details-table-wrapper">
          <table className="bank-details-table">
            <thead>
              <tr>
                <th>Professional</th>
                <th>Account Holder</th>
                <th>Bank Name</th>
                <th>Account Number</th>
                <th>IFSC Code</th>
                <th>Submitted Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bankDetails.map((details) => (
                <tr key={details._id}>
                  <td>
                    <div className="professional-info">
                      <strong>{getProfessionalName(details)}</strong>
                      <span className="small">{details.userId?.email}</span>
                    </div>
                  </td>
                  <td>{details.accountHolderName || '-'}</td>
                  <td>{details.bankName || '-'}</td>
                  <td>
                    <span className="account-number">
                      {maskAccountNumber(details.accountNumber)}
                    </span>
                  </td>
                  <td>{details.ifscCode || '-'}</td>
                  <td>
                    {new Date(details.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-verify"
                        onClick={() => handleVerifyClick(details)}
                        disabled={processing}
                        title="Verify bank details"
                      >
                        ✓ Verify
                      </button>
                      <button
                        className="btn btn-reject"
                        onClick={() => handleRejectClick(details)}
                        disabled={processing}
                        title="Reject bank details"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for action confirmation */}
      {showModal && selectedDetails && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {actionType === 'verify'
                  ? '✓ Verify Bank Details'
                  : '✕ Reject Bank Details'}
              </h3>
            </div>

            <div className="modal-body">
              <div className="details-box">
                <p>
                  <strong>Professional:</strong>{' '}
                  {getProfessionalName(selectedDetails)}
                </p>
                <p>
                  <strong>Account Holder:</strong>{' '}
                  {selectedDetails.accountHolderName}
                </p>
                <p>
                  <strong>Bank:</strong> {selectedDetails.bankName}
                </p>
                <p>
                  <strong>Account:</strong>{' '}
                  {maskAccountNumber(selectedDetails.accountNumber)}
                </p>
                <p>
                  <strong>IFSC:</strong> {selectedDetails.ifscCode}
                </p>
              </div>

              {actionType === 'reject' && (
                <div className="form-group">
                  <label htmlFor="rejectionReason">Rejection Reason *</label>
                  <textarea
                    id="rejectionReason"
                    className="form-control"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection (e.g., Account details invalid, Documents incomplete)"
                    rows="4"
                  />
                </div>
              )}

              {actionType === 'verify' && (
                <p className="verify-confirmation">
                  Are you sure you want to verify this bank account? The professional
                  will be able to withdraw funds using this account.
                </p>
              )}
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
                className={`btn ${
                  actionType === 'verify' ? 'btn-confirm-verify' : 'btn-confirm-reject'
                }`}
                onClick={handleConfirmAction}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBankDetailsVerification;
