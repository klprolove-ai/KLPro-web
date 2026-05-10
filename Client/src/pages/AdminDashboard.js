import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminServicesSection from '../components/AdminServicesSection';
import AdminProductsSection from '../components/AdminProductsSection';
import AdminWalletDashboard from '../components/Admin/AdminDashboard';
import API_BASE_URL from '../config/apiConfig';
import { SERVICE_HIERARCHY, getHierarchyOptions, getServiceTypeOptions } from '../config/serviceHierarchy';
import { useCall } from '../context/CallContext';
import './AdminDashboard.css';

function AdminDashboard() {
  const { startKycVideoCall, isCallBusy } = useCall();
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [productCount, setProductCount] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'shop');
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [professionalApplications, setProfessionalApplications] = useState([]);
  const [applicationActionLoadingId, setApplicationActionLoadingId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [homepageCards, setHomepageCards] = useState([]);
  const [editingHomepageCard, setEditingHomepageCard] = useState(null);
  const [homepageCardImageFile, setHomepageCardImageFile] = useState(null);
  const [showHomepageCardForm, setShowHomepageCardForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingActionLoadingId, setBookingActionLoadingId] = useState(null);
  const [productOrders, setProductOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderActionLoadingId, setOrderActionLoadingId] = useState(null);
  const [kycCallingId, setKycCallingId] = useState('');
  const [kycScheduleDrafts, setKycScheduleDrafts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    
    Promise.all([
      fetchAdminProfile(),
      fetchUsers(),
      fetchStatistics(),
      fetchServices(),
      fetchProducts(),
      fetchProfessionalApplications(),
      fetchBookings(),
      fetchProductOrders(),
      fetchContacts(),
      fetchHomepageCards()
    ]).catch(err => {
      setError(err.message);
      if (err.message.includes('401')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminEmail');
        navigate('/admin/login');
      }
    }).finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    setSelectedUser(null);
    setEditingUser(null);
  }, [activeTab]);

  const refreshAdminData = useCallback(async () => {
    await Promise.allSettled([
      fetchUsers(),
      fetchStatistics(),
      fetchServices(),
      fetchProducts(),
      fetchProfessionalApplications(),
      fetchBookings(),
      fetchProductOrders(),
      fetchContacts(),
      fetchHomepageCards(),
    ]);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return undefined;

    let mounted = true;
    const interval = window.setInterval(() => {
      if (!mounted) return;
      refreshAdminData().catch(() => {});
    }, 15000);

    const handleFocus = () => {
      refreshAdminData().catch(() => {});
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshAdminData]);

  const fetchAdminProfile = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin profile');
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setUsers([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/users/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data.statistics || {
        totalUsers: 0,
        customers: 0,
        professionals: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0
      });
    } catch (err) {
      console.error('Fetch statistics error:', err);
      setStatistics({
        totalUsers: 0,
        customers: 0,
        professionals: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0
      });
    }
  };

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/services`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const data = await response.json();
      setServices(Array.isArray(data.services) ? data.services : []);
    } catch (err) {
      console.error('Fetch services error:', err);
      setServices([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/products?limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      const totalProducts = data.pagination?.total ?? data.products?.length ?? 0;
      setProductCount(totalProducts);
    } catch (err) {
      console.error('Fetch products error:', err);
      setProductCount(0);
    }
  };

  const fetchProfessionalApplications = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/professionals/applications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch professional applications');
      }

      const data = await response.json();
      setProfessionalApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (err) {
      console.error('Fetch professional applications error:', err);
      setProfessionalApplications([]);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/bookings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (err) {
      console.error('Fetch bookings error:', err);
      setBookings([]);
    }
  };

  const fetchProductOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setProductOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setProductOrders([]);
    }
  };

  const handleSelectBooking = async (booking) => {
    const bookingId = String(booking?._id || booking?.id || '');
    if (!bookingId) return;

    setSelectedBooking(booking || null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load booking details');
      }

      const data = await response.json();
      setSelectedBooking(data.booking || null);
    } catch (bookingError) {
      setError(bookingError.message || 'Failed to load booking details');
    }
  };

  const handleSelectOrder = async (order) => {
    const orderId = String(order?._id || order?.id || '');
    if (!orderId) return;

    setSelectedOrder(order || null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load order details');
      }

      const data = await response.json();
      setSelectedOrder(data.order || null);
    } catch (orderError) {
      setError(orderError.message || 'Failed to load order details');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    if (!orderId) return;

    try {
      setOrderActionLoadingId(orderId);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update order status');
      }

      const data = await response.json();
      setSelectedOrder(data.order || null);
      setProductOrders((prev) => prev.map((order) => (String(order._id) === String(orderId) ? data.order : order)));
      alert('Order status updated successfully');
    } catch (orderUpdateError) {
      setError(orderUpdateError.message || 'Failed to update order status');
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Delete this booking history permanently?')) {
      return;
    }

    try {
      setBookingActionLoadingId(bookingId);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete booking history');
      }

      setBookings((prev) => prev.filter((booking) => String(booking._id) !== String(bookingId)));
      setSelectedBooking((current) => (current && String(current._id) === String(bookingId) ? null : current));
      refreshAdminData().catch(() => {});
    } catch (bookingDeleteError) {
      setError(bookingDeleteError.message || 'Failed to delete booking history');
    } finally {
      setBookingActionLoadingId(null);
    }
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/contacts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contact messages');
      }

      const data = await response.json();
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    } catch (err) {
      console.error('Fetch contacts error:', err);
      setContacts([]);
    }
  };

  const fetchHomepageCards = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/homepage-cards`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch homepage cards');
      }

      const data = await response.json();
      setHomepageCards(Array.isArray(data.cards) ? data.cards : []);
    } catch (err) {
      console.error('Fetch homepage cards error:', err);
      setHomepageCards([]);
    }
  };

  const handleCreateHomepageCard = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('section', editingHomepageCard.section);
      formData.append('title', editingHomepageCard.title);
      formData.append('subtitle', editingHomepageCard.subtitle || '');
      formData.append('image', editingHomepageCard.image || '');
      formData.append('time', editingHomepageCard.time || '');
      formData.append('order', editingHomepageCard.order ?? 0);
      formData.append('isActive', String(editingHomepageCard.isActive));
      if (homepageCardImageFile) {
        formData.append('imageFile', homepageCardImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/admin/homepage-cards`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create homepage card');
      }

      await fetchHomepageCards();
      setEditingHomepageCard(null);
      setHomepageCardImageFile(null);
      setShowHomepageCardForm(false);
      alert('Homepage card created successfully');
    } catch (err) {
      setError(err.message || 'Failed to create homepage card');
    }
  };

  const handleUpdateHomepageCard = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('section', editingHomepageCard.section);
      formData.append('title', editingHomepageCard.title);
      formData.append('subtitle', editingHomepageCard.subtitle || '');
      formData.append('image', editingHomepageCard.image || '');
      formData.append('time', editingHomepageCard.time || '');
      formData.append('order', editingHomepageCard.order ?? 0);
      formData.append('isActive', String(editingHomepageCard.isActive));
      if (homepageCardImageFile) {
        formData.append('imageFile', homepageCardImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/admin/homepage-cards/${editingHomepageCard._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update homepage card');
      }

      await fetchHomepageCards();
      setEditingHomepageCard(null);
      setHomepageCardImageFile(null);
      alert('Homepage card updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update homepage card');
    }
  };

  const handleDeleteHomepageCard = async (cardId) => {
    if (!window.confirm('Delete this homepage card?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/homepage-cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete homepage card');
      }

      await fetchHomepageCards();
      alert('Homepage card deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete homepage card');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Delete this contact request?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact message');
      }

      setContacts(contacts.filter((contact) => contact._id !== contactId));
      alert('Contact request deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete contact request');
    }
  };

  const updateKycScheduleDraft = (applicationId, field, value) => {
    setKycScheduleDrafts((prev) => ({
      ...prev,
      [applicationId]: {
        ...(prev[applicationId] || {}),
        [field]: value,
      },
    }));
  };

  const handleReviewProfessional = async (applicationId, status, stage = 'initial') => {
    try {
      setApplicationActionLoadingId(applicationId);
      const token = localStorage.getItem('adminToken');
      const scheduleDraft = kycScheduleDrafts[applicationId] || {};
      const response = await fetch(`${API_BASE_URL}/admin/professionals/${applicationId}/review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          stage,
          verificationDate: scheduleDraft.verificationDate || '',
          verificationTime: scheduleDraft.verificationTime || '',
          verificationMeetingLink: scheduleDraft.verificationMeetingLink || '',
          note: scheduleDraft.note || '',
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to review professional application');
      }

      await Promise.all([fetchProfessionalApplications(), fetchUsers(), fetchStatistics()]);
      if (stage === 'initial' && status === 'approved') {
        setKycScheduleDrafts((prev) => {
          const next = { ...prev };
          delete next[applicationId];
          return next;
        });
      }
      alert(`Professional application ${status} successfully`);
    } catch (err) {
      setError(err.message || 'Failed to review professional application');
    } finally {
      setApplicationActionLoadingId(null);
    }
  };

  const handleStartKycCall = async (applicationId) => {
    try {
      setError('');
      setKycCallingId(applicationId);
      await startKycVideoCall(applicationId);
    } catch (callError) {
      setError(callError.message || 'Unable to start KYC video call.');
    } finally {
      setKycCallingId('');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u._id !== userId));
      setSelectedUser(null);
      alert('User deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleUpdateUser = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingUser)
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u._id === updatedUser.user._id ? updatedUser.user : u));
      setEditingUser(null);
      setSelectedUser(null);
      alert('User updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete service');
      }

      setServices(services.filter(s => s._id !== serviceId));
      setSelectedService(null);
      alert('Service deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete service');
    }
  };

  const handleUpdateService = async () => {
    try {
      // Client-side validation - use proper checks for numeric fields
      if (!editingService.name || !editingService.description || !editingService.category || 
          editingService.basePrice === undefined || editingService.basePrice === '' || 
          editingService.estimatedDuration === undefined || editingService.estimatedDuration === '') {
        setError('Please fill in all required fields: Name, Description, Category, Price, and Duration');
        return;
      }

      const subCategoryOptions = Object.keys(SERVICE_HIERARCHY[editingService.category] || {});
      if (subCategoryOptions.length > 0 && !editingService.subCategory) {
        setError('Please select a subcategory');
        return;
      }

      const subSubCategoryOptions = getHierarchyOptions(editingService.category, editingService.subCategory).subSubCategories;
      if (subSubCategoryOptions.length > 0 && !editingService.subSubCategory) {
        setError('Please select a sub-subcategory');
        return;
      }

      const serviceTypeOptions = getServiceTypeOptions(
        editingService.category,
        editingService.subCategory,
        editingService.subSubCategory
      );
      if (serviceTypeOptions.length > 0 && !editingService.serviceType) {
        setError('Please select a service type');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      
      formData.append('name', editingService.name);
      formData.append('description', editingService.description);
      formData.append('category', editingService.category);
      formData.append('subCategory', editingService.subCategory || '');
      formData.append('subSubCategory', editingService.subSubCategory || '');
      formData.append('serviceType', editingService.serviceType || '');
      formData.append('basePrice', editingService.basePrice);
      formData.append('estimatedDuration', editingService.estimatedDuration);
      formData.append('isActive', editingService.isActive);
      formData.append('rating', editingService.rating);
      formData.append('reviewCount', editingService.reviewCount);
      
      // Add image file if selected, otherwise add the current image URL
      if (serviceImageFile) {
        formData.append('image', serviceImageFile);
      } else if (editingService.image) {
        formData.append('image', editingService.image);
      }

      const response = await fetch(`${API_BASE_URL}/admin/services/${editingService._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update service');
      }

      const updatedService = await response.json();
      setServices(services.map(s => s._id === updatedService.service._id ? updatedService.service : s));
      setEditingService(null);
      setSelectedService(null);
      setServiceImageFile(null);
      setImagePreview(null);
      alert('Service updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update service');
    }
  };

  const handleCreateService = async () => {
    try {
      // Client-side validation - use proper checks for numeric fields
      if (!editingService.name || !editingService.description || !editingService.category || 
          editingService.basePrice === undefined || editingService.basePrice === '' || 
          editingService.estimatedDuration === undefined || editingService.estimatedDuration === '') {
        setError('Please fill in all required fields: Name, Description, Category, Price, and Duration');
        return;
      }

      const subCategoryOptions = Object.keys(SERVICE_HIERARCHY[editingService.category] || {});
      if (subCategoryOptions.length > 0 && !editingService.subCategory) {
        setError('Please select a subcategory');
        return;
      }

      const subSubCategoryOptions = getHierarchyOptions(editingService.category, editingService.subCategory).subSubCategories;
      if (subSubCategoryOptions.length > 0 && !editingService.subSubCategory) {
        setError('Please select a sub-subcategory');
        return;
      }

      const serviceTypeOptions = getServiceTypeOptions(
        editingService.category,
        editingService.subCategory,
        editingService.subSubCategory
      );
      if (serviceTypeOptions.length > 0 && !editingService.serviceType) {
        setError('Please select a service type');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      
      formData.append('name', editingService.name);
      formData.append('description', editingService.description);
      formData.append('category', editingService.category);
      formData.append('subCategory', editingService.subCategory || '');
      formData.append('subSubCategory', editingService.subSubCategory || '');
      formData.append('serviceType', editingService.serviceType || '');
      formData.append('basePrice', editingService.basePrice);
      formData.append('estimatedDuration', editingService.estimatedDuration);
      
      // Log what's being sent
      console.log('Creating service with:', {
        name: editingService.name,
        description: editingService.description,
        category: editingService.category,
        subCategory: editingService.subCategory,
        subSubCategory: editingService.subSubCategory,
        serviceType: editingService.serviceType,
        basePrice: editingService.basePrice,
        estimatedDuration: editingService.estimatedDuration,
        hasImage: !!serviceImageFile
      });
      
      // Add image file if selected
      if (serviceImageFile) {
        formData.append('image', serviceImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/admin/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.message || 'Failed to create service');
      }

      const newService = await response.json();
      setServices([...services, newService.service]);
      setEditingService(null);
      setShowServiceForm(false);
      setServiceImageFile(null);
      setImagePreview(null);
      alert('Service created successfully');
    } catch (err) {
      console.error('Error in handleCreateService:', err);
      setError(err.message || 'Failed to create service');
    }
  };

  const handleServiceImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setServiceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleMostBooked = async (serviceId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/services/${serviceId}/most-booked`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle most booked status');
      }

      const updatedService = await response.json();
      setServices(services.map(s => s._id === updatedService.service._id ? updatedService.service : s));
      setSelectedService(updatedService.service);
      alert(`Service ${updatedService.service.isMostBooked ? 'marked as' : 'unmarked from'} most booked`);
    } catch (err) {
      setError(err.message || 'Failed to toggle most booked status');
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/admin/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    navigate('/');
  };

  const customerUsers = users.filter((user) => user.userType === 'customer');
  const professionalUsers = users.filter((user) => user.userType === 'professional');
  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customerUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProfessionals = professionalUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingProfessionalApplications = professionalApplications.filter(
    (application) => application.approvalStatus === 'pending'
  );
  const scheduledProfessionalApplications = professionalApplications.filter(
    (application) => application.approvalStatus === 'approved' && application.verificationStatus === 'scheduled'
  );
  const verificationQueueCount = pendingProfessionalApplications.length + scheduledProfessionalApplications.length;

  const adminEmail = localStorage.getItem('adminEmail') || 'Administrator';
  const totalServices = services.length;
  const activeServices = services.filter((service) => service.isActive).length;
  const mostBookedServices = services.filter((service) => service.isMostBooked).length;
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const categorySplit = services.reduce((acc, service) => {
    const key = service.category || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const categoryColors = ['#00a6fb', '#2a9d8f', '#ff9f1c', '#ef476f', '#7b2cbf', '#3d5a80'];
  const categoryEntries = Object.entries(categorySplit)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, count], index) => ({
      category,
      count,
      percent: totalServices > 0 ? Math.round((count / totalServices) * 100) : 0,
      color: categoryColors[index % categoryColors.length]
    }));

  let runningAngle = 0;
  const donutSegments = categoryEntries.map((item) => {
    const sweep = Math.round((item.count / Math.max(totalServices, 1)) * 360);
    const segment = `${item.color} ${runningAngle}deg ${runningAngle + sweep}deg`;
    runningAngle += sweep;
    return segment;
  });

  const donutStyle = {
    background: donutSegments.length > 0
      ? `conic-gradient(${donutSegments.join(', ')})`
      : 'conic-gradient(#dbe5f0 0deg 360deg)'
  };

  const getDateKey = (date) => new Date(date).toISOString().slice(0, 10);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    return {
      key: getDateKey(day),
      label: day.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });

  const weeklyGrowthData = weekDays.map((day) => {
    const value = users.filter((user) => user.createdAt && getDateKey(user.createdAt) === day.key).length;
    return {
      label: day.label,
      value
    };
  });

  const weeklyMax = Math.max(...weeklyGrowthData.map((point) => point.value), 1);
  let latestVerification = statistics?.totalUsers
    ? Math.round(((statistics?.verifiedUsers || 0) / statistics.totalUsers) * 100)
    : 0;

  const verificationTrendData = weekDays.map((day) => {
    const dayUsers = users.filter((user) => user.createdAt && getDateKey(user.createdAt) === day.key);
    if (dayUsers.length === 0) {
      return { label: day.label, value: latestVerification };
    }

    const verifiedCount = dayUsers.filter((user) => user.isVerified).length;
    latestVerification = Math.round((verifiedCount / dayUsers.length) * 100);
    return { label: day.label, value: latestVerification };
  });

  const trendPoints = verificationTrendData
    .map((point, index) => {
      const x = verificationTrendData.length === 1 ? 50 : (index / (verificationTrendData.length - 1)) * 100;
      const y = 40 - (Math.min(100, Math.max(0, point.value)) / 100) * 35;
      return `${x},${y}`;
    })
    .join(' ');

  const sidebarItems = [
    { id: 'shop', icon: '🛍️', label: 'Shop', count: statistics?.totalUsers || 0 },
    { id: 'orders', icon: '📦', label: 'Orders', count: productOrders.length },
    { id: 'bookings', icon: '📅', label: 'Bookings', count: bookings.length },
    { id: 'wallet', icon: '💰', label: 'Wallet', count: null },
    { id: 'customers', icon: '👥', label: 'Customers', count: customerUsers.length },
    { id: 'contacts', icon: '✉️', label: 'Contacts', count: contacts.length },
    { id: 'professionals', icon: '🧑‍🔧', label: 'Professionals', count: professionalUsers.length, pendingCount: verificationQueueCount },
    { id: 'catalog', icon: '🧾', label: 'Services', count: services.length },
    { id: 'homecards', icon: '🏠', label: 'Home Cards', count: homepageCards.length },
    { id: 'products', icon: '📦', label: 'Products', count: productCount },
    { id: 'analytics', icon: '📈', label: 'Analytics', count: 3 },
    { id: 'settings', icon: '⚙️', label: 'Settings', count: null }
  ];

  const renderCharts = () => (
    <section className="charts-grid">
      <article className="chart-card">
        <div className="chart-head">
          <h3>Weekly Growth</h3>
          <span>User registrations</span>
        </div>
        <div className="weekly-bars">
          {weeklyGrowthData.map((point) => (
            <div key={point.label} className="bar-item">
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: `${Math.max(8, Math.round((point.value / weeklyMax) * 100))}%` }}
                />
              </div>
              <span className="bar-value">{point.value}</span>
              <span className="bar-label">{point.label}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="chart-card">
        <div className="chart-head">
          <h3>Service Category Split</h3>
          <span>Catalog composition</span>
        </div>
        <div className="donut-layout">
          <div className="donut-chart" style={donutStyle}>
            <span>{totalServices}</span>
            <small>Services</small>
          </div>
          <div className="donut-legend">
            {categoryEntries.length > 0 ? (
              categoryEntries.map((item) => (
                <div key={item.category} className="legend-item">
                  <span className="legend-swatch" style={{ background: item.color }} />
                  <span className="legend-text">{item.category}</span>
                  <span className="legend-value">{item.percent}%</span>
                </div>
              ))
            ) : (
              <p className="empty-chart">No category data yet.</p>
            )}
          </div>
        </div>
      </article>

      <article className="chart-card">
        <div className="chart-head">
          <h3>Verification Trend</h3>
          <span>7-day trust score</span>
        </div>
        <div className="line-chart-wrap">
          <svg viewBox="0 0 100 42" className="line-chart" preserveAspectRatio="none" aria-hidden="true">
            <polyline points="0,40 100,40" className="line-grid" />
            <polyline points={trendPoints} className="line-path" />
          </svg>
          <div className="line-chart-footer">
            {verificationTrendData.map((point) => (
              <div key={point.label} className="line-dot">
                <strong>{point.value}%</strong>
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard-container theme-${theme}`}>
      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <span className="sidebar-logo">KL</span>
            <div>
              <p className="sidebar-title">KL Admin</p>
              <p className="sidebar-subtitle">Commerce Ops</p>
            </div>
          </div>
          <nav className="sidebar-nav" aria-label="Admin navigation">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                type="button"
              >
                <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                <span className="sidebar-link-text">{item.label}</span>
                {item.count !== null && <span className="sidebar-count">{item.count}</span>}
                {item.pendingCount > 0 && <span className="sidebar-pending-badge">{item.pendingCount}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="theme-toggle-btn" onClick={toggleTheme} type="button">
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
            <button className="admin-logout-btn sidebar-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <div className="admin-main-panel">
          <div className="admin-header">
            <div className="admin-header-content">
              <div className="admin-header-copy">
                <p className="admin-kicker">Store Command Center</p>
                <h1>E-Commerce Admin Panel</h1>
                <p className="admin-subtitle">Manage customers, services, and platform health from one place.</p>
                <div className="admin-admin-meta">
                  <span>{adminEmail}</span>
                  <span>{todayLabel}</span>
                </div>
              </div>
              <button className="theme-toggle-btn header-theme-toggle" onClick={toggleTheme} type="button">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>

          {verificationQueueCount > 0 && (
            <div className="admin-top-notification" role="status" aria-live="polite">
              <div>
                <strong>{verificationQueueCount} professional verification task{verificationQueueCount > 1 ? 's' : ''} pending</strong>
                <p>Approve new applications, schedule KYC calls, and complete the final verification review.</p>
              </div>
              <button
                type="button"
                className="admin-top-notification-btn"
                onClick={() => setActiveTab('customers')}
              >
                Review Now
              </button>
            </div>
          )}

          {error && <div className="admin-error">{error}</div>}

          <div className="admin-dashboard-content">
            {(activeTab === 'shop' || activeTab === 'analytics') && (
              <div className="admin-highlight-grid">
                <article className="highlight-card highlight-users">
                  <span className="highlight-title">Total Customers</span>
                  <span className="highlight-value">{statistics?.customers || 0}</span>
                  <span className="highlight-caption">Registered shopper accounts</span>
                </article>
                <article className="highlight-card highlight-services">
                  <span className="highlight-title">Active Services</span>
                  <span className="highlight-value">{activeServices}</span>
                  <span className="highlight-caption">Out of {totalServices} listed services</span>
                </article>
                <article className="highlight-card highlight-growth">
                  <span className="highlight-title">Verified Profiles</span>
                  <span className="highlight-value">{statistics?.verifiedUsers || 0}</span>
                  <span className="highlight-caption">KYC and trust-ready users</span>
                </article>
                <article className="highlight-card highlight-trending">
                  <span className="highlight-title">Trending Services</span>
                  <span className="highlight-value">{mostBookedServices}</span>
                  <span className="highlight-caption">Marked as most booked</span>
                </article>
              </div>
            )}

            {activeTab === 'shop' && statistics && (
              <>
                <div className="stats-container">
                  <h2>Business Overview</h2>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value stat-value-total">{statistics.totalUsers}</div>
                      <div className="stat-label">Total Users</div>
                      <div className="stat-meta">All registered accounts</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value stat-value-customers">{statistics.customers}</div>
                      <div className="stat-label">Customers</div>
                      <div className="stat-meta">Active marketplace buyers</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value stat-value-professionals">{statistics.professionals}</div>
                      <div className="stat-label">Professionals</div>
                      <div className="stat-meta">Sellers and service experts</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value stat-value-verified">{statistics.verifiedUsers}</div>
                      <div className="stat-label">Verified Users</div>
                      <div className="stat-meta">Trusted platform members</div>
                    </div>
                  </div>
                </div>
                {renderCharts()}
              </>
            )}

            {activeTab === 'orders' && (
              <section className="users-section">
                <div className="users-header">
                  <h2>Orders</h2>
                  <button type="button" className="theme-toggle-btn" onClick={fetchProductOrders}>Refresh</button>
                </div>
                <div className="order-workspace">
                  <div className="order-list-panel">
                    <div className="order-list-panel__header">
                      <h3>Order History</h3>
                      <p>Select an order to inspect shipping, payment, and status details.</p>
                    </div>

                    <div className="services-list order-services-list">
                      {productOrders.length === 0 ? (
                        <p>No orders found.</p>
                      ) : (
                        productOrders.map((order) => (
                          <div
                            key={order._id}
                            className={`service-item order-card ${selectedOrder && String(selectedOrder._id) === String(order._id) ? 'selected' : ''}`}
                            onClick={() => handleSelectOrder(order)}
                          >
                            <div className="service-item-info">
                              <h4>Order #{order._id.slice(-6)}</h4>
                              <p>Order Status: {order.orderStatus}</p>
                              <p>Payment Status: {order.paymentStatus}</p>
                              <p>Customer: {order?.customerId?.name || 'N/A'}</p>
                              <p>Total: ₹{order.total?.toFixed?.(2) ?? order.total}</p>
                            </div>
                            <div className="service-item-actions order-card__actions">
                              <button
                                type="button"
                                className="btn-view"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSelectOrder(order);
                                }}
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <aside className={`booking-detail-panel ${selectedOrder ? 'is-open' : 'is-empty'}`}>
                    {selectedOrder ? (
                      <>
                        <div className="booking-detail-panel__header">
                          <div>
                            <p className="booking-detail-panel__eyebrow">Order Details</p>
                            <h3>Order #{selectedOrder._id.slice(-6)}</h3>
                            <p className="booking-detail-panel__subtext">
                              Payment, shipping, and product details for the selected order.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="booking-detail-close-btn"
                            onClick={() => setSelectedOrder(null)}
                          >
                            Close
                          </button>
                        </div>

                        <div className="booking-detail-panel__body">
                          <div className="booking-metric-grid">
                            <div className="booking-metric-card">
                              <span>Order Status</span>
                              <strong>{selectedOrder.orderStatus}</strong>
                            </div>
                            <div className="booking-metric-card">
                              <span>Payment Status</span>
                              <strong>{selectedOrder.paymentStatus}</strong>
                            </div>
                            <div className="booking-metric-card">
                              <span>Total Amount</span>
                              <strong>₹{selectedOrder.total?.toFixed?.(2) ?? selectedOrder.total}</strong>
                            </div>
                          </div>

                          <div className="booking-info-stack">
                            <p><strong>Recipient Name:</strong> {selectedOrder.shippingDetails?.fullName || 'N/A'}</p>
                            <p><strong>Email:</strong> {selectedOrder.shippingDetails?.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> {selectedOrder.shippingDetails?.phone || 'N/A'}</p>
                            <p><strong>Shipping Address:</strong> {selectedOrder.shippingDetails ? `${selectedOrder.shippingDetails.address}, ${selectedOrder.shippingDetails.city} - ${selectedOrder.shippingDetails.pincode}` : 'N/A'}</p>
                          </div>

                          <div className="booking-photo-grid">
                            <div className="booking-photo-card">
                              <p>Products Ordered</p>
                              {selectedOrder.products && selectedOrder.products.length > 0 ? (
                                <div className="order-items-list">
                                  {selectedOrder.products.map((item, idx) => (
                                    <div key={`${item.productId || item.name}-${idx}`} className="order-item-detail">
                                      <span className="item-name">{item.name}</span>
                                      <span className="item-qty">Qty: {item.quantity}</span>
                                      <span className="item-price">₹{item.price?.toFixed?.(2) ?? item.price}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span>No products in this order.</span>
                              )}
                            </div>
                          </div>

                          <div className="booking-detail-actions">
                            <label htmlFor="order-status-select"><strong>Update Order Status</strong></label>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <select
                                id="order-status-select"
                                value={selectedOrder.orderStatus}
                                onChange={(e) => setSelectedOrder((prev) => prev ? { ...prev, orderStatus: e.target.value } : prev)}
                                style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                              >
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <button
                                type="button"
                                className="btn-save"
                                disabled={orderActionLoadingId === selectedOrder._id}
                                onClick={() => handleUpdateOrderStatus(selectedOrder._id, selectedOrder.orderStatus)}
                              >
                                {orderActionLoadingId === selectedOrder._id ? 'Saving...' : 'Save Status'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="booking-detail-empty">
                        <h3>No order selected</h3>
                        <p>Choose an order from the list to review shipping and payment details.</p>
                      </div>
                    )}
                  </aside>
                </div>
              </section>
            )}

            {activeTab === 'bookings' && (
              <section className="users-section">
                <div className="users-header">
                  <h2>Bookings</h2>
                  <button type="button" className="theme-toggle-btn" onClick={fetchBookings}>Refresh</button>
                </div>
                <div className="booking-workspace">
                  <div className="booking-list-panel">
                    <div className="booking-list-panel__header">
                      <h3>Booking History</h3>
                      <p>Select a booking to inspect the workflow, OTPs, and work photos.</p>
                    </div>

                    <div className="services-list booking-services-list">
                      {bookings.length === 0 ? (
                        <p>No bookings found.</p>
                      ) : (
                        bookings.map((booking) => (
                          <div
                            key={booking._id}
                            className={`service-item booking-card ${selectedBooking && String(selectedBooking._id) === String(booking._id) ? 'selected' : ''}`}
                            onClick={() => handleSelectBooking(booking)}
                          >
                            <div className="service-item-info">
                              <h4>{booking?.serviceId?.name || 'Service'}</h4>
                              <p>Status: {booking.status}</p>
                              <p>Customer: {booking?.customerId?.name || 'N/A'}</p>
                              <p>Professional: {booking?.professionalId?.userId?.name || 'N/A'}</p>
                            </div>
                            <div className="service-item-actions booking-card__actions">
                              <button
                                type="button"
                                className="btn-view"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSelectBooking(booking);
                                }}
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                className="btn-delete-small"
                                disabled={bookingActionLoadingId === booking._id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteBooking(booking._id);
                                }}
                              >
                                {bookingActionLoadingId === booking._id ? 'Deleting...' : 'Delete History'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <aside className={`booking-detail-panel ${selectedBooking ? 'is-open' : 'is-empty'}`}>
                    {selectedBooking ? (
                      <>
                        <div className="booking-detail-panel__header">
                          <div>
                            <p className="booking-detail-panel__eyebrow">Booking Details</p>
                            <h3>{selectedBooking?.serviceId?.name || 'Service Booking'}</h3>
                            <p className="booking-detail-panel__subtext">
                              Customer and professional workflow, OTPs, proof images, and audit trail.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="booking-detail-close-btn"
                            onClick={() => setSelectedBooking(null)}
                          >
                            Close
                          </button>
                        </div>

                        <div className="booking-detail-panel__body">
                          <div className="booking-metric-grid">
                            <div className="booking-metric-card">
                              <span>Status</span>
                              <strong>{selectedBooking.status}</strong>
                            </div>
                            <div className="booking-metric-card">
                              <span>Latest Start OTP</span>
                              <strong>{selectedBooking.startOtp || 'N/A'}</strong>
                            </div>
                            <div className="booking-metric-card">
                              <span>Latest Final OTP</span>
                              <strong>{selectedBooking.completionOtp || 'N/A'}</strong>
                            </div>
                          </div>

                          <div className="booking-info-stack">
                            <p><strong>Start OTP Verified At:</strong> {selectedBooking.startOtpVerifiedAt ? new Date(selectedBooking.startOtpVerifiedAt).toLocaleString() : 'N/A'}</p>
                            <p><strong>Final OTP Verified At:</strong> {selectedBooking.completionOtpVerifiedAt ? new Date(selectedBooking.completionOtpVerifiedAt).toLocaleString() : 'N/A'}</p>
                          </div>

                          <div className="booking-photo-grid">
                            <div className="booking-photo-card">
                              <p>Latest Start Photo</p>
                              {selectedBooking.workStartPhotoUrl ? (
                                <img src={selectedBooking.workStartPhotoUrl} alt="Work start" />
                              ) : (
                                <span>No start photo uploaded yet.</span>
                              )}
                            </div>
                            <div className="booking-photo-card">
                              <p>Latest Final Photo</p>
                              {selectedBooking.workEndPhotoUrl ? (
                                <img src={selectedBooking.workEndPhotoUrl} alt="Work end" />
                              ) : (
                                <span>No final photo uploaded yet.</span>
                              )}
                            </div>
                          </div>

                          <div className="booking-detail-actions">
                            <button
                              type="button"
                              className="btn-delete"
                              disabled={bookingActionLoadingId === selectedBooking._id}
                              onClick={() => handleDeleteBooking(selectedBooking._id)}
                            >
                              {bookingActionLoadingId === selectedBooking._id ? 'Deleting...' : 'Delete Booking History'}
                            </button>
                          </div>

                          <div className="booking-audit-panel">
                            <h4>Audit Timeline</h4>
                            {Array.isArray(selectedBooking.auditLogs) && selectedBooking.auditLogs.length > 0 ? (
                              <div className="booking-audit-list">
                                {selectedBooking.auditLogs
                                  .slice()
                                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                  .map((entry, index) => (
                                    <div key={`${entry.action}-${entry.createdAt || index}`} className="booking-audit-item">
                                      <strong>{entry.action}</strong>
                                      <span>
                                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}
                                        {entry.actorRole ? ` • ${entry.actorRole}` : ''}
                                      </span>
                                      {entry.notes ? <p>{entry.notes}</p> : null}
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p>No audit events yet.</p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="booking-detail-empty">
                        <h3>No booking selected</h3>
                        <p>Choose a booking from the list to open a focused detail view here.</p>
                      </div>
                    )}
                  </aside>
                </div>
              </section>
            )}

            {activeTab === 'wallet' && (
              <section className="users-section">
                <div className="users-header">
                  <h2>Wallet Management</h2>
                  <p>Monitor commissions, cash flow, and professional balances.</p>
                </div>
                <AdminWalletDashboard />
              </section>
            )}

            {activeTab === 'customers' && (
          <div className="users-section">
            <div className="users-header">
              <h2>Customer Management</h2>
              <input
                type="text"
                placeholder="Search customer by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {selectedUser ? (
              <div className="user-detail-view">
                <button 
                  className="back-btn"
                  onClick={() => {
                    setSelectedUser(null);
                    setEditingUser(null);
                  }}
                >
                  ← Back to List
                </button>

                {editingUser ? (
                  <div className="user-edit-form">
                    <h3>Edit User</h3>
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={editingUser.email} disabled />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={editingUser.phone}
                        onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={editingUser.city}
                        onChange={(e) => setEditingUser({...editingUser, city: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>User Type</label>
                      <select
                        value={editingUser.userType}
                        onChange={(e) => setEditingUser({...editingUser, userType: e.target.value})}
                      >
                        <option value="customer">Customer</option>
                        <option value="professional">Professional</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Verified</label>
                      <input
                        type="checkbox"
                        checked={editingUser.isVerified}
                        onChange={(e) => setEditingUser({...editingUser, isVerified: e.target.checked})}
                      />
                    </div>
                    <div className="form-actions">
                      <button className="btn-save" onClick={handleUpdateUser}>Save Changes</button>
                      <button className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="user-detail-card">
                    <h3>{selectedUser.name}</h3>
                    <div className="detail-row">
                      <span className="label">Email:</span>
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span>{selectedUser.phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">City:</span>
                      <span>{selectedUser.city || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Type:</span>
                      <span className="badge">{selectedUser.userType}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Verified:</span>
                      <span>{selectedUser.isVerified ? '✓ Yes' : '✗ No'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Member Since:</span>
                      <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => setEditingUser({...selectedUser})}
                      >
                        Edit User
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteUser(selectedUser._id)}
                      >
                        Delete User
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Type</th>
                      <th>Verified</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(user => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td><span className="badge">{user.userType}</span></td>
                          <td>{user.isVerified ? '✓' : '✗'}</td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className="btn-view"
                              onClick={() => setSelectedUser(user)}
                            >
                              View
                            </button>
                            <button 
                              className="btn-delete-small"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="users-section">
            <div className="users-header">
              <h2>Contact Requests</h2>
              <input
                type="text"
                placeholder="Search contact requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <tr key={contact._id}>
                        <td>{contact.name}</td>
                        <td>{contact.email}</td>
                        <td>{contact.phone || '—'}</td>
                        <td>{contact.subject || 'General'}</td>
                        <td>{contact.message.length > 80 ? `${contact.message.slice(0, 80)}...` : contact.message}</td>
                        <td>{new Date(contact.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button className="btn-delete-small" onClick={() => handleDeleteContact(contact._id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">No contact requests found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'professionals' && (
          <div className="users-section">
            <div className="users-header">
              <h2>Professional Management</h2>
              <input
                type="text"
                placeholder="Search professional by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="professional-applications-panel">
              <h3>Professional Registration Requests</h3>
              {pendingProfessionalApplications.length === 0 ? (
                <p className="professional-applications-empty">No pending professional registrations.</p>
              ) : (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Category</th>
                        <th>Subcategory</th>
                        <th>PAN</th>
                        <th>PAN Image</th>
                        <th>Aadhaar</th>
                        <th>Aadhaar Image</th>
                        <th>KYC Schedule</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingProfessionalApplications.map((application) => (
                        <tr key={application._id}>
                          <td>{application.userId?.name || 'Unknown'}</td>
                          <td>{application.userId?.email || 'Unknown'}</td>
                          <td>{application.category || '-'}</td>
                          <td>{application.subCategory || '-'}</td>
                          <td>{application.panCardNumber || '-'}</td>
                          <td>
                            {application.panCardImageUrl ? (
                              <a
                                href={application.panCardImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="kyc-doc-link"
                              >
                                View Image
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{application.aadhaarCardNumber || '-'}</td>
                          <td>
                            {application.aadhaarCardImageUrl ? (
                              <a
                                href={application.aadhaarCardImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="kyc-doc-link"
                              >
                                View Image
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <div className="kyc-schedule-inline">
                              <input
                                type="date"
                                value={kycScheduleDrafts[application._id]?.verificationDate || ''}
                                onChange={(e) => updateKycScheduleDraft(application._id, 'verificationDate', e.target.value)}
                              />
                              <input
                                type="time"
                                value={kycScheduleDrafts[application._id]?.verificationTime || ''}
                                onChange={(e) => updateKycScheduleDraft(application._id, 'verificationTime', e.target.value)}
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Optional meeting note"
                              value={kycScheduleDrafts[application._id]?.note || ''}
                              onChange={(e) => updateKycScheduleDraft(application._id, 'note', e.target.value)}
                              style={{ marginTop: 8, width: '100%' }}
                            />
                          </td>
                          <td>
                            <button
                              className="btn-view"
                              type="button"
                              disabled={applicationActionLoadingId === application._id}
                              onClick={() => handleReviewProfessional(application._id, 'approved', 'initial')}
                            >
                              Approve & Schedule
                            </button>
                            <button
                              className="btn-delete-small"
                              type="button"
                              disabled={applicationActionLoadingId === application._id}
                              onClick={() => handleReviewProfessional(application._id, 'rejected', 'initial')}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="professional-applications-panel" style={{ marginTop: 24 }}>
              <h3>KYC Verification Queue</h3>
              {scheduledProfessionalApplications.length === 0 ? (
                <p className="professional-applications-empty">No scheduled KYC verifications yet.</p>
              ) : (
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Schedule</th>
                        <th>Notification</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledProfessionalApplications.map((application) => (
                        <tr key={`kyc-${application._id}`}>
                          <td>{application.userId?.name || 'Unknown'}</td>
                          <td>
                            <span className="badge">{application.verificationStatus || 'scheduled'}</span>
                          </td>
                          <td>
                            <div>{application.verificationScheduledAt ? new Date(application.verificationScheduledAt).toLocaleDateString() : 'TBD'}</div>
                            <div>{application.verificationScheduledTime || 'TBD'}</div>
                          </td>
                          <td>{application.verificationNotification || 'KYC verification scheduled.'}</td>
                          <td>
                            <button
                              className="btn-view"
                              type="button"
                              disabled={isCallBusy || applicationActionLoadingId === application._id || kycCallingId === application._id}
                              onClick={() => handleStartKycCall(application._id)}
                            >
                              {kycCallingId === application._id ? 'Connecting...' : 'Video KYC Call'}
                            </button>
                            <button
                              className="btn-view"
                              type="button"
                              disabled={applicationActionLoadingId === application._id}
                              onClick={() => handleReviewProfessional(application._id, 'approved', 'final')}
                            >
                              Final Approve
                            </button>
                            <button
                              className="btn-delete-small"
                              type="button"
                              disabled={applicationActionLoadingId === application._id}
                              onClick={() => handleReviewProfessional(application._id, 'rejected', 'final')}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedUser ? (
              <div className="user-detail-view">
                <button
                  className="back-btn"
                  onClick={() => {
                    setSelectedUser(null);
                    setEditingUser(null);
                  }}
                >
                  ← Back to List
                </button>

                {editingUser ? (
                  <div className="user-edit-form">
                    <h3>Edit Professional</h3>
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={editingUser.email} disabled />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={editingUser.phone}
                        onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={editingUser.city}
                        onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Verified</label>
                      <input
                        type="checkbox"
                        checked={editingUser.isVerified}
                        onChange={(e) => setEditingUser({ ...editingUser, isVerified: e.target.checked })}
                      />
                    </div>
                    <div className="form-actions">
                      <button className="btn-save" onClick={handleUpdateUser}>Save Changes</button>
                      <button className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="user-detail-card">
                    <h3>{selectedUser.name}</h3>
                    <div className="detail-row">
                      <span className="label">Email:</span>
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span>{selectedUser.phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">City:</span>
                      <span>{selectedUser.city || 'Not provided'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Type:</span>
                      <span className="badge">{selectedUser.userType}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Verified:</span>
                      <span>{selectedUser.isVerified ? '✓ Yes' : '✗ No'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Member Since:</span>
                      <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-actions">
                      <button className="btn-edit" onClick={() => setEditingUser({ ...selectedUser })}>
                        Edit Professional
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteUser(selectedUser._id)}>
                        Delete Professional
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Type</th>
                      <th>Verified</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfessionals.length > 0 ? (
                      filteredProfessionals.map((user) => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td><span className="badge">{user.userType}</span></td>
                          <td>{user.isVerified ? '✓' : '✗'}</td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button className="btn-view" onClick={() => setSelectedUser(user)}>
                              View
                            </button>
                            <button className="btn-delete-small" onClick={() => handleDeleteUser(user._id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">No professionals found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'catalog' && (
          <AdminServicesSection
            services={services}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            editingService={editingService}
            setEditingService={setEditingService}
            showServiceForm={showServiceForm}
            setShowServiceForm={setShowServiceForm}
            handleDeleteService={handleDeleteService}
            handleUpdateService={handleUpdateService}
            handleCreateService={handleCreateService}
            handleToggleMostBooked={handleToggleMostBooked}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleServiceImageChange={handleServiceImageChange}
            imagePreview={imagePreview}
          />
        )}

        {activeTab === 'homecards' && (
          <section className="users-section">
            <div className="users-header">
              <h2>Homepage Cards</h2>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => {
                  setShowHomepageCardForm(true);
                  setEditingHomepageCard({
                    section: 'explore-popular-categories',
                    title: '',
                    subtitle: '',
                    image: '',
                    time: '',
                    order: 0,
                    isActive: true,
                  });
                  setHomepageCardImageFile(null);
                }}
              >
                Add Card
              </button>
            </div>

            {showHomepageCardForm && editingHomepageCard && (
              <div className="user-edit-form" style={{ marginBottom: 16 }}>
                <h3>{editingHomepageCard._id ? 'Edit Card' : 'Add Card'}</h3>
                <div className="form-group">
                  <label>Section</label>
                  <select
                    value={editingHomepageCard.section}
                    onChange={(e) => setEditingHomepageCard({ ...editingHomepageCard, section: e.target.value })}
                  >
                    <option value="explore-popular-categories">Explore Popular Categories</option>
                    <option value="salon-for-women">Salon for Women</option>
                    <option value="cleaning-essentials">Cleaning Essentials</option>
                    <option value="grooming-for-men">Grooming for Men</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editingHomepageCard.title}
                    onChange={(e) => setEditingHomepageCard({ ...editingHomepageCard, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Subtitle (optional)</label>
                  <input
                    type="text"
                    value={editingHomepageCard.subtitle || ''}
                    onChange={(e) => setEditingHomepageCard({ ...editingHomepageCard, subtitle: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Image URL (optional)</label>
                  <input
                    type="text"
                    value={editingHomepageCard.image || ''}
                    onChange={(e) => setEditingHomepageCard({ ...editingHomepageCard, image: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Upload Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setHomepageCardImageFile(e.target.files?.[0] || null)}
                  />
                  {homepageCardImageFile && (
                    <p style={{ marginTop: 8 }}><strong>Selected file:</strong> {homepageCardImageFile.name}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Time (optional)</label>
                  <input
                    type="text"
                    value={editingHomepageCard.time || ''}
                    onChange={(e) => setEditingHomepageCard({ ...editingHomepageCard, time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input
                    type="number"
                    value={editingHomepageCard.order ?? 0}
                    onChange={(e) => setEditingHomepageCard({ ...editingHomepageCard, order: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Active</label>
                  <input
                    type="checkbox"
                    checked={Boolean(editingHomepageCard.isActive)}
                    onChange={(e) => setEditingHomepageCard({ ...editingHomepageCard, isActive: e.target.checked })}
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="btn-save"
                    onClick={editingHomepageCard._id ? handleUpdateHomepageCard : handleCreateHomepageCard}
                  >
                    {editingHomepageCard._id ? 'Update Card' : 'Create Card'}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setShowHomepageCardForm(false);
                      setEditingHomepageCard(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Title</th>
                    <th>Subtitle</th>
                    <th>Time</th>
                    <th>Order</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {homepageCards.length > 0 ? (
                    homepageCards.map((card) => (
                      <tr key={card._id}>
                        <td>{card.section}</td>
                        <td>{card.title}</td>
                        <td>{card.subtitle || '-'}</td>
                        <td>{card.time || '-'}</td>
                        <td>{card.order ?? 0}</td>
                        <td>{card.isActive ? 'Yes' : 'No'}</td>
                        <td>
                          <button
                            className="btn-view"
                            onClick={() => {
                              setShowHomepageCardForm(true);
                              setEditingHomepageCard({ ...card });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-delete-small"
                            onClick={() => handleDeleteHomepageCard(card._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">No homepage cards found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'products' && (
          <AdminProductsSection />
        )}

            {activeTab === 'analytics' && (
              <section className="users-section">
                <div className="users-header">
                  <h2>Analytics</h2>
                </div>
                {renderCharts()}
              </section>
            )}

            {activeTab === 'settings' && (
              <section className="users-section">
                <div className="users-header">
                  <h2>Settings</h2>
                </div>
                <div className="settings-grid">
                  <article className="settings-card">
                    <h3>Appearance</h3>
                    <p>Choose how your admin panel looks during day and night operations.</p>
                    <button className="theme-toggle-btn settings-toggle" onClick={toggleTheme} type="button">
                      {theme === 'dark' ? 'Use Light Theme' : 'Use Dark Theme'}
                    </button>
                  </article>
                  <article className="settings-card">
                    <h3>Admin Session</h3>
                    <p>Signed in as <strong>{adminEmail}</strong>.</p>
                    <p>Use secure logout if you are done with dashboard management.</p>
                    <button className="btn-delete" onClick={handleLogout} type="button">Secure Logout</button>
                  </article>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
