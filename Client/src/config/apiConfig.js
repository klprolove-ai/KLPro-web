// API Configuration
// Priority: environment variable > development/production detection
const ensureApiSuffix = (baseUrl) => {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!normalized) return '';
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

// Get API URL from environment variable or detect based on hostname
const getApiUrl = () => {
  // First priority: explicit environment variable
  if (process.env.REACT_APP_API_URL) {
    return ensureApiSuffix(process.env.REACT_APP_API_URL);
  }

  // Check if running in browser
  if (typeof window === 'undefined') {
    return 'https://klpro-web.onrender.com/api';
  }

  const hostname = window.location.hostname;
  
  // Development environments
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }

  // Production - use environment variable or backend URL
  return process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'https://klpro-web.onrender.com/api';
};

const API_BASE_URL = getApiUrl();

export default API_BASE_URL;
