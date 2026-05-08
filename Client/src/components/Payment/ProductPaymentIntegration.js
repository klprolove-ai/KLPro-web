import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './ProductPaymentIntegration.css';

const ProductPaymentIntegration = ({ orderId, amount, items, shippingDetails, onPaymentComplete }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Initialize Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to proceed with payment');
        setProcessing(false);
        return;
      }

      // Create Razorpay order
      const response = await axios.post(
        `${API_BASE_URL}/payment/create-order-product`,
        {
          orderId,
          amount,
          paymentMethod: 'razorpay',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { razorpayOrderId, razorpayKey, keyId } = response.data.data;
      setOrderDetails(response.data.data);

      if (!window.Razorpay) {
        throw new Error('Razorpay library not loaded');
      }

      const options = {
        key: razorpayKey || keyId,
        order_id: razorpayOrderId,
        amount: amount * 100,
        currency: 'INR',
        name: 'KLPro',
        description: `Product Order: ${orderId}`,
        customer_notify: 1,
        prefill: {
          name: shippingDetails?.fullName || '',
          email: shippingDetails?.email || '',
          contact: shippingDetails?.phone || '',
        },
        handler: async (response) => {
          await verifyPayment(response);
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setError('Payment cancelled');
          },
        },
        theme: {
          color: '#007bff',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Payment initiation failed');
      setProcessing(false);
    }
  };

  const verifyPayment = async (razorpayResponse) => {
    try {
      const token = localStorage.getItem('token');

      const verifyPayload = {
        razorpayOrderId: razorpayResponse.razorpay_order_id,
        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
        razorpaySignature: razorpayResponse.razorpay_signature,
      };

      const response = await axios.post(
        `${API_BASE_URL}/payment/verify`,
        verifyPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess('Payment successful! Your order has been confirmed.');
        setTimeout(() => {
          if (onPaymentComplete) {
            onPaymentComplete({
              paymentId: response.data.data.paymentId,
              orderId,
              status: 'completed',
            });
          }
        }, 2000);
      } else {
        setError('Payment verification failed');
        setProcessing(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.message || 'Payment verification failed');
      setProcessing(false);
    }
  };

  return (
    <div className="product-payment-integration">
      <div className="payment-header">
        <h3>Complete Payment</h3>
        <p>Order Total: ₹{amount.toFixed(2)}</p>
      </div>

      <div className="payment-details">
        <div className="order-summary">
          <h4>Order Items</h4>
          {items && items.length > 0 ? (
            <div className="items-list">
              {items.map((item, idx) => (
                <div key={idx} className="item-summary">
                  <span>{item.name} x {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <button
        className="btn-pay-now"
        onClick={handlePayment}
        disabled={processing}
      >
        {processing ? 'Processing...' : `Pay ₹${amount.toFixed(2)} with Razorpay`}
      </button>
    </div>
  );
};

export default ProductPaymentIntegration;
