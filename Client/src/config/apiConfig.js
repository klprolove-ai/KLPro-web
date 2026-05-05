// API Configuration
// Priority: environment variable > development/production detection
const ensureApiSuffix = (baseUrl) => {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!normalized) return '';
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

// Get API URL from environment variable or detect based on hostname
const getApiUrl = () => {
  // First priority: explicit environment variables (set in .env files)
  if (process.env.REACT_APP_API_URL) {
    console.log('Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return ensureApiSuffix(process.env.REACT_APP_API_URL);
  }
  
  if (process.env.REACT_APP_BACKEND_URL) {
    console.log('Using REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
    return ensureApiSuffix(process.env.REACT_APP_BACKEND_URL);
  }

  // Check if running in browser
  if (typeof window === 'undefined') {
    return 'https://klpro-web.onrender.com/api';
  }

  const hostname = window.location.hostname;
  
  // Development environments
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('Local development detected, using localhost:5000');
    return 'http://localhost:5000/api';
  }

  // Production - use render backend as fallback
  console.log('Production environment detected, using render backend');
  return 'https://klpro-web.onrender.com/api';
};

const API_BASE_URL = getApiUrl();
console.log('API_BASE_URL:', API_BASE_URL);

export default API_BASE_URL;
