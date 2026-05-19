import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './PaymentIntegration.css';

const PaymentIntegration = ({ bookingId, amount, onPaymentComplete, initialPayment = null }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const autoStartRef = useRef(false);
  const paymentTimeoutRef = useRef(null);

  const getAuthToken = () => localStorage.getItem('userToken') || localStorage.getItem('token') || '';

  // Initialize Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setError('Payment gateway failed to load. Please refresh and try again.');
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const verifyPayment = useCallback(async (razorpayResponse) => {
      try {
        const token = getAuthToken();

        const verifyResponse = await axios.post(`${API_BASE_URL}/payment/verify`,
          {
            razorpay_order_id: razorpayResponse.razorpay_order_id || razorpayResponse.razorpayOrderId,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id || razorpayResponse.razorpayPaymentId,
            razorpay_signature: razorpayResponse.razorpay_signature || razorpayResponse.razorpaySignature,
            paymentId: razorpayResponse.paymentId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setSuccess('Payment successful!');
        setTimeout(() => {
          if (onPaymentComplete) {
            onPaymentComplete(verifyResponse.data);
          }
        }, 1500);
      } catch (err) {
        setError(err.response?.data?.message || 'Payment verification failed');
      } finally {
        setProcessing(false);
      }
    }, [onPaymentComplete]);

  const handleRazorpayPayment = useCallback(async () => {
    try {
      setProcessing(true);
      const token = getAuthToken();

      if (!token) {
        throw new Error('Please login again before completing payment.');
      }

      let razorpayOrderId = null;
      let paymentId = null;
      let resolvedKey = process.env.REACT_APP_RAZORPAY_KEY || null;

      // If server already returned initial payment info (from booking creation), use that and skip create-order
      if (initialPayment && initialPayment.razorpayOrderId) {
        razorpayOrderId = initialPayment.razorpayOrderId;
        paymentId = initialPayment.paymentId || initialPayment._id || null;
        resolvedKey = initialPayment.razorpayKey || initialPayment.keyId || resolvedKey;
      } else {
        // Create order
        const orderResponse = await axios.post(`${API_BASE_URL}/payment/create-order-booking`, 
          { 
            bookingId,
            amount,
            paymentMethod: 'razorpay',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { razorpayOrderId: rzpOrder, razorpayKey, keyId, paymentId: pId } = orderResponse.data?.data || orderResponse.data || {};
        razorpayOrderId = rzpOrder || orderResponse.data?.razorpayOrderId || orderResponse.data?.data?.razorpayOrderId;
        paymentId = pId || orderResponse.data?.paymentId || orderResponse.data?.data?.paymentId;
        resolvedKey = razorpayKey || keyId || resolvedKey;
      }

      // Open Razorpay checkout
      const options = {
        key: resolvedKey,
        amount: amount * 100,
        currency: 'INR',
        name: 'KLPro',
        description: `Booking #${bookingId}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
          }
          await verifyPayment({
            ...response,
            paymentId,
          });
        },
        prefill: {
          name: localStorage.getItem('userName') || '',
          email: localStorage.getItem('userEmail') || '',
          contact: localStorage.getItem('userPhone') || ''
        },
        theme: {
          color: '#0066cc'
        }
      };

      if (typeof window.Razorpay !== 'function') {
        throw new Error('Payment gateway is still loading. Please try again.');
      }

      const rzp = new window.Razorpay(options);
      
      // Handle payment cancellation
      rzp.on('payment.failed', (response) => {
        console.log('Payment failed:', response);
        if (paymentTimeoutRef.current) {
          clearTimeout(paymentTimeoutRef.current);
        }
        setError('Payment failed. Please try again.');
        setProcessing(false);
      });

      // Handle modal dismissal (user cancelled)
      rzp.on('dismiss', async () => {
        console.log('Payment modal dismissed by user for booking:', bookingId);
        if (paymentTimeoutRef.current) {
          clearTimeout(paymentTimeoutRef.current);
        }
        try {
          const token = getAuthToken();
          console.log('Token available:', !!token);
          console.log('Attempting to cancel booking:', bookingId);
          
          const cancelResponse = await axios.post(`${API_BASE_URL}/bookings/${bookingId}/cancel`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log('Booking cancelled successfully:', cancelResponse.data);
          setError('Payment cancelled. Booking has been cancelled.');
          setTimeout(() => {
            if (onPaymentComplete) {
              onPaymentComplete({ cancelled: true });
            }
          }, 2000);
        } catch (cancelErr) {
          console.error('Failed to cancel booking:', cancelErr);
          setError('Payment cancelled, but booking may still be pending. Please contact support.');
        }
        setProcessing(false);
      });

      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create payment order');
      setProcessing(false);
    }
  }, [amount, bookingId, verifyPayment, initialPayment, onPaymentComplete]);

  useEffect(() => {
    if (!bookingId || !amount || !razorpayLoaded) return;
    if (autoStartRef.current) return;

    autoStartRef.current = true;
    
    // Set a timeout to cancel booking if payment is not completed within 5 minutes
    paymentTimeoutRef.current = setTimeout(async () => {
      console.log('Payment timeout reached, cancelling booking:', bookingId);
      try {
        const token = getAuthToken();
        await axios.post(`${API_BASE_URL}/bookings/${bookingId}/cancel`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setError('Payment timed out. Booking has been cancelled.');
        setTimeout(() => {
          if (onPaymentComplete) {
            onPaymentComplete({ cancelled: true, timeout: true });
          }
        }, 2000);
      } catch (cancelErr) {
        console.error('Failed to cancel booking on timeout:', cancelErr);
        setError('Payment timed out, but booking may still be pending. Please contact support.');
      }
      setProcessing(false);
    }, 5 * 60 * 1000); // 5 minutes

    handleRazorpayPayment();
  }, [amount, bookingId, handleRazorpayPayment, onPaymentComplete, razorpayLoaded]);

  return (
    <div className="payment-integration">
      <div className="payment-header">
        <h3>💳 Payment</h3>
        <div className="amount-display">
          Amount: <span className="amount-value">₹{amount?.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="payment-processing">
        <div className="processing-content">
          <h4>Processing Online Payment</h4>
          <p>Opening secure payment gateway...</p>
          {processing && (
            <div className="processing-indicator">
              <div className="spinner"></div>
              <p>Please wait while we redirect you to the payment gateway</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Info */}
      <div className="payment-info">
        <h4>💡 Payment Information</h4>
        <ul>
          <li>All payments are secure and encrypted</li>
          <li>You will receive SMS confirmation after payment</li>
          <li>Processing time: Instant for online payments</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentIntegration;
