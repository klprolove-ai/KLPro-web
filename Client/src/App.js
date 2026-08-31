import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import FloatingToggle from './components/FloatingToggle';
import ProfessionalRequestAlert from './components/ProfessionalRequestAlert';
import FirstVisitLocationPrompt from './components/FirstVisitLocationPrompt';
import AnalyticsRouteTracker from './components/AnalyticsRouteTracker';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceDetails from './pages/ServiceDetails';
import Professionals from './pages/Professionals';
import ProfessionalDetails from './pages/ProfessionalDetails';
import Bookings from './pages/Bookings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import OrderDetailsUser from './pages/OrderDetailsUser';
import OrderDetailsProfessional from './pages/OrderDetailsProfessional';
import OrdersListUser from './pages/OrdersListUser';
import OrdersListProfessional from './pages/OrdersListProfessional';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import HelpCenter from './pages/HelpCenter';
import FAQs from './pages/FAQs';
import Contact from './pages/Contact';
import BankDetails from './pages/BankDetails';
import ProfessionalWalletPage from './pages/ProfessionalWalletPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import ProfessionalBookingsPage from './pages/ProfessionalBookingsPage';
import AdminWithdrawalManagement from './pages/AdminWithdrawalManagement';
import { CallProvider } from './context/CallContext';

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsRouteTracker />
      <CallProvider>
        <div className="App">
          <Routes>
            {/* Admin Routes */}
<Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawalManagement />} />

            {/* User Routes */}
            <Route
              path="/*"
              element={
                <>
                  <Header />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/services/:id" element={<ServiceDetails />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/product/:id" element={<ProductDetails />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/orders/:id" element={<OrderDetailsUser />} />
                      <Route path="/professional/orders/:id" element={<OrderDetailsProfessional />} />
                      <Route path="/orders-list" element={<OrdersListUser />} />
                      <Route path="/professional/orders-list" element={<OrdersListProfessional />} />
                      <Route path="/professionals" element={<Professionals />} />
                      <Route path="/professionals/:id" element={<ProfessionalDetails />} />
                      <Route path="/bookings" element={<Bookings />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/professional/dashboard" element={<ProfessionalDashboard />} />
                      <Route path="/professional/bank-details" element={<BankDetails />} />
                      <Route path="/professional/wallet" element={<ProfessionalWalletPage />} />
                      <Route path="/professional/work-orders" element={<WorkOrdersPage />} />
                      <Route path="/user/bookings" element={<ProfessionalBookingsPage />} /><Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-conditions" element={<TermsConditions />} />
                      <Route path="/help-center" element={<HelpCenter />} />
                      <Route path="/faqs" element={<FAQs />} />
                      <Route path="/contact" element={<Contact />} />
                    </Routes>
                  </main>
                  <Footer />
                  <FloatingToggle />
                  <ProfessionalRequestAlert />
                  <FirstVisitLocationPrompt />
                </>
              }
            />
          </Routes>
        </div>
      </CallProvider>
    </>
  );
}

export default App;
