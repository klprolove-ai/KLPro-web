import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/apiConfig';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [adminWallet, setAdminWallet] = useState(null);
  const [commissionReport, setCommissionReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchAdminData();
  }, [period]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [walletRes, reportRes, analyticsRes, professionalsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin-wallet/details`, { headers }),
        axios.get(`${API_BASE_URL}/admin-wallet/commission-report?period=${period}`, { headers }),
        axios.get(`${API_BASE_URL}/admin-wallet/payment-analytics`, { headers }),
        axios.get(`${API_BASE_URL}/admin-wallet/professional-earnings`, { headers })
      ]);

      setAdminWallet(walletRes.data);
      setCommissionReport(reportRes.data);
      setAnalytics(analyticsRes.data);
      setProfessionals(professionalsRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="skeleton-loader">
          <div className="skeleton-box skeleton-large"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>📊 Admin Dashboard</h1>
        <button onClick={fetchAdminData} className="btn-refresh">🔄 Refresh</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${selectedTab === 'commission' ? 'active' : ''}`}
          onClick={() => setSelectedTab('commission')}
        >
          Commission
        </button>
        <button
          className={`tab-btn ${selectedTab === 'professionals' ? 'active' : ''}`}
          onClick={() => setSelectedTab('professionals')}
        >
          Professionals
        </button>
        <button
          className={`tab-btn ${selectedTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setSelectedTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="tab-content">
          <div className="overview-grid">
            <div className="card large">
              <h3>Total Balance</h3>
              <div className="amount">₹{formatCurrency(adminWallet?.totalBalance)}</div>
              <p className="subtitle">Admin Wallet</p>
            </div>
            <div className="card">
              <h3>Total Commission</h3>
              <div className="amount">₹{formatCurrency(adminWallet?.totalCommissionReceived)}</div>
              <p className="subtitle">All time</p>
            </div>
            <div className="card">
              <h3>Cash Collected</h3>
              <div className="amount">₹{formatCurrency(adminWallet?.totalCashCollected)}</div>
              <p className="subtitle">From cash payments</p>
            </div>
            <div className="card">
              <h3>Total Bookings</h3>
              <div className="amount">{adminWallet?.totalBookings || 0}</div>
              <p className="subtitle">Processed</p>
            </div>
            <div className="card">
              <h3>Total Refunds</h3>
              <div className="amount">{adminWallet?.totalRefunds || 0}</div>
              <p className="subtitle">Processed</p>
            </div>
          </div>
        </div>
      )}

      {/* Commission Tab */}
      {selectedTab === 'commission' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Commission Report</h2>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {commissionReport && (
            <div className="commission-grid">
              <div className="card">
                <h3>Period Commission</h3>
                <div className="amount">₹{formatCurrency(commissionReport.totalCommission)}</div>
                <p className="subtitle">For {period}</p>
              </div>
              <div className="card">
                <h3>Transactions</h3>
                <div className="amount">{commissionReport.count || 0}</div>
                <p className="subtitle">Number of transactions</p>
              </div>
              <div className="card">
                <h3>Average Commission</h3>
                <div className="amount">
                  ₹{formatCurrency((commissionReport.totalCommission / (commissionReport.count || 1)))}
                </div>
                <p className="subtitle">Per transaction</p>
              </div>
            </div>
          )}

          {commissionReport?.breakdown && (
            <div className="breakdown-section">
              <h3>Breakdown</h3>
              <div className="breakdown-list">
                {Object.entries(commissionReport.breakdown).map(([key, value]) => (
                  <div key={key} className="breakdown-item">
                    <span className="label">{key.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="value">₹{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Professionals Tab */}
      {selectedTab === 'professionals' && (
        <div className="tab-content">
          <h2>Professional Earnings</h2>
          <div className="professionals-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Total Earnings</th>
                  <th>Current Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {professionals.map(prof => (
                  <tr key={prof._id}>
                    <td>{prof.name}</td>
                    <td>{prof.category}</td>
                    <td className="amount">₹{formatCurrency(prof.totalEarnings)}</td>
                    <td className="amount highlight">₹{formatCurrency(prof.currentBalance)}</td>
                    <td>
                      <span className={`status-badge ${prof.status}`}>
                        {prof.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <a href={`/admin/professionals/${prof._id}`} className="btn-small">
                        Manage
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="tab-content">
          <h2>Payment Analytics</h2>
          {analytics && (
            <div className="analytics-grid">
              <div className="card">
                <h3>This Month</h3>
                <div className="amount">₹{formatCurrency(analytics.thisMonth)}</div>
                <p className="subtitle">Total payments</p>
              </div>
              <div className="card">
                <h3>Last Month</h3>
                <div className="amount">₹{formatCurrency(analytics.lastMonth)}</div>
                <p className="subtitle">Previous month</p>
              </div>
              <div className="card">
                <h3>Growth</h3>
                <div className={`amount ${(analytics.growth || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(analytics.growth || 0).toFixed(2)}%
                </div>
                <p className="subtitle">Month over month</p>
              </div>
              <div className="card">
                <h3>Failed Payments</h3>
                <div className="amount">{analytics.failedPayments || 0}</div>
                <p className="subtitle">This month</p>
              </div>
            </div>
          )}

          {analytics?.paymentMethodBreakdown && (
            <div className="breakdown-section">
              <h3>Payment Method Breakdown</h3>
              <div className="breakdown-list">
                {Object.entries(analytics.paymentMethodBreakdown).map(([method, data]) => (
                  <div key={method} className="breakdown-item">
                    <span className="label">{method.toUpperCase()}</span>
                    <span className="value">
                      ₹{formatCurrency(data.amount)} ({data.count} payments)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
