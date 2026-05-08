import React from 'react';
import { useNavigate } from 'react-router-dom';
import BankDetailsForm from '../components/Professional/BankDetailsForm';
import './BankDetails.css';

const BankDetails = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  React.useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  return (
    <div className="bank-details-page">
      <button
        className="btn-back"
        onClick={() => navigate('/professional/dashboard')}
      >
        ← Back to Dashboard
      </button>
      <BankDetailsForm />
    </div>
  );
};

export default BankDetails;
