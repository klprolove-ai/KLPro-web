import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';

export default function OrdersListProfessional() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/products/professional/orders`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (res.data && res.data.orders) setOrders(res.data.orders);
      } catch (err) {
        console.error('Error loading professional orders', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div>Loading orders...</div>;

  return (
    <div className="orders-list pro-orders">
      <h2>Product Orders For You</h2>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <ul>
          {orders.map((o) => (
            <li key={o._id} style={{ marginBottom: 12 }}>
              <div><strong>Order:</strong> {o._id}</div>
              <div><strong>Total:</strong> {o.total}</div>
              <div><strong>Status:</strong> {o.orderStatus}</div>
              <button onClick={() => navigate(`/professional/orders/${o._id}`)}>View</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
