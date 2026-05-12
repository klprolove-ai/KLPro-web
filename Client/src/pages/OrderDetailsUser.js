import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import './OrderDetails.css';

export default function OrderDetailsUser() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/products/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(res.data.order);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/products/orders/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('Order cancelled');
      navigate('/profile');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container">{error}</div>;

  return (
    <div className="page-container order-details">
      <h2>Order Details</h2>
      <div className="order-card">
        <div className="order-row"><strong>Order ID:</strong> {order._id}</div>
        <div className="order-row"><strong>Status:</strong> {order.orderStatus}</div>
        <div className="order-row"><strong>Payment Status:</strong> {order.paymentStatus}</div>
        <div className="order-row"><strong>Total:</strong> ₹{order.total}</div>
        <h4>Items</h4>
        <ul>
          {order.products.map((p) => (
            <li key={p.productId}>{p.name} — Qty: {p.quantity} — ₹{p.price}</li>
          ))}
        </ul>
        <h4>Shipping</h4>
        <div>{order.shippingDetails?.fullName}</div>
        <div>{order.shippingDetails?.address}</div>
        <div>{order.shippingDetails?.city} — {order.shippingDetails?.pincode}</div>

        {order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered' && (
          <button className="danger-btn" onClick={handleCancel}>Cancel Order</button>
        )}
      </div>
    </div>
  );
}
