import React, { useState } from 'react';
import './ReviewForm.css';
import { createReview } from '../api/services';

const ReviewForm = ({ productId, professionalId, serviceId, onReviewSubmit, reviewType, subjectLabel = 'this item' }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const unwrapResponse = (response) => response?.data ?? response;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setMessage('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      setMessage('Comment must be at least 10 characters long');
      return;
    }

    try {
      setLoading(true);
      const reviewData = {
        rating,
        comment,
        reviewType,
        ...(reviewType === 'product' && { productId }),
        ...(reviewType === 'professional' && { professionalId }),
        ...(reviewType === 'service' && { serviceId }),
      };

      const response = await createReview(reviewData);
      const data = unwrapResponse(response);

      if (data?.success) {
        setMessage('Review submitted successfully!');
        setRating(0);
        setComment('');
        setTimeout(() => {
          setMessage('');
          onReviewSubmit();
        }, 1500);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error submitting review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-form-container">
      <div className="review-form-header">
        <div>
          <p className="section-eyebrow">Your feedback</p>
          <h3>Leave a Review</h3>
        </div>
        <p className="review-form-subtitle">Share how {subjectLabel} worked for you.</p>
      </div>
      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label>Your Rating</label>
          <div className="rating-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star-btn ${rating >= star ? 'active' : ''}`}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>
          {rating > 0 && <span className="rating-display">{rating} out of 5 stars</span>}
        </div>

        <div className="form-group">
          <label htmlFor="comment">Your Review</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Share your experience with ${subjectLabel}...`}
            rows="5"
            disabled={loading}
          />
          <span className="char-count">{comment.length}/500</span>
        </div>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;
