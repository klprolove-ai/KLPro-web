import api from './axios';

// Auth Services
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// User Services
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getAllUsers: () => api.get('/users'),
};

// Service Services
export const serviceService = {
  getAll: (category) => api.get(`/services${category ? `?category=${category}` : ''}`),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

// Professional Services
export const professionalService = {
  getAll: () => api.get('/professionals'),
  getById: (id) => api.get(`/professionals/${id}`),
  create: (data) => api.post('/professionals', data),
  update: (id, data) => api.put(`/professionals/${id}`, data),
};

// Booking Services
export const bookingService = {
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  cancel: (id) => api.post(`/bookings/${id}/cancel`),
};

// Product Services
export const getProducts = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  return api.get(`/products?${params.toString()}`);
};

export const getProductById = (id) => api.get(`/products/${id}`);

export const createProduct = (data) => api.post('/products', data);

export const updateProduct = (id, data) => api.put(`/products/${id}`, data);

export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const uploadProductImages = (productId, files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });
  return api.post(`/products/${productId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteProductImage = (productId, publicId) =>
  api.delete(`/products/${productId}/images`, {
    data: { publicId },
  });

export const getProductCategories = () => api.get('/products/categories');

export const getServiceById = (id) => api.get(`/services/${id}`);

export const getServices = () => api.get('/services');

// Review Services
export const createReview = (data) => api.post('/reviews', data);

export const getProductReviews = (productId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  return api.get(`/reviews/product/${productId}?${params.toString()}`);
};

export const getProfessionalReviews = (professionalId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  return api.get(`/reviews/professional/${professionalId}?${params.toString()}`);
};

export const getServiceReviews = (serviceId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  return api.get(`/reviews/service/${serviceId}?${params.toString()}`);
};

export const getAllReviews = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.reviewType) params.append('reviewType', filters.reviewType);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  return api.get(`/reviews?${params.toString()}`);
};

export const deleteReview = (reviewId) => api.delete(`/reviews/${reviewId}`);
