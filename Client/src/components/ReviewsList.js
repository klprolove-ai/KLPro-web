import React, { useState } from 'react';
import './ReviewsList.css';
import { deleteReview } from '../api/services';

const ReviewsList = ({ reviews, currentPage, totalPages, onPageChange, emptyTitle = 'No reviews yet', emptyMessage = 'Be the first to leave feedback.' }) => {
  const [deleting, setDeleting] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  const unwrapResponse = (response) => response?.data ?? response;

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        setDeleting(reviewId);
        const response = await deleteReview(reviewId);
        const data = unwrapResponse(response);

        if (data?.success) {
          // Refresh the page
          window.location.reload();
        }
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting review');
        setDeleting(null);
      }
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="review-stars">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < rating ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (reviews.length === 0) {
    return (
      <div className="reviews-list-container">
        <div className="no-reviews-card">
          <p className="no-reviews-title">{emptyTitle}</p>
          <p className="no-reviews">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-list-container">
      <div className="reviews-list">
        {reviews.map((review) => (
          <div key={review._id} className="review-item">
            <div className="review-header">
              <div className="reviewer-info">
                {review.reviewer.profileImage ? (
                  <img
                    src={review.reviewer.profileImage}
                    alt={review.reviewer.name}
                    className="reviewer-avatar"
                  />
                ) : (
                  <div className="reviewer-avatar-placeholder">
                    {review.reviewer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="reviewer-details">
                  <h4>{review.reviewer.name}</h4>
                  <p className="review-date">{formatDate(review.createdAt)}</p>
                </div>
              </div>
              {user && user._id === review.reviewer._id && (
                <button
                  className="delete-review-btn"
                  onClick={() => handleDeleteReview(review._id)}
                  disabled={deleting === review._id}
                  title="Delete review"
                >
                  {deleting === review._id ? 'Deleting...' : '×'}
                </button>
              )}
            </div>

            <div className="review-content">
              {renderStars(review.rating)}
              <p className="review-comment">{review.comment}</p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="reviews-pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="pagination-btn"
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
