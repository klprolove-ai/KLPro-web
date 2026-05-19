import React, { useEffect, useState } from 'react';

const BookingCancelDialog = ({
  isOpen,
  title = 'Cancel Booking',
  message = 'Please share a reason for cancelling this booking. This will be visible to the user, professional, and admin.',
  confirmLabel = 'Confirm Cancel',
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason || submitting) return;

    try {
      setSubmitting(true);
      await onConfirm(trimmedReason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <div className="modal-body">
          <p className="warning">{message}</p>
          <div className="form-group">
            <label htmlFor="cancelReason">Reason *</label>
            <textarea
              id="cancelReason"
              rows="4"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter the reason for cancellation"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Keep Booking
          </button>
          <button type="button" className="btn-cancel" onClick={handleConfirm} disabled={submitting || !reason.trim()}>
            {submitting ? 'Submitting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingCancelDialog;