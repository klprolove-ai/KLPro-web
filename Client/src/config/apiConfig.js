// API Configuration
// Priority: environment variable > production default > development default
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const ensureApiSuffix = (baseUrl) => {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!normalized) return '';
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const configuredApiUrl = process.env.REACT_APP_API_URL;

const API_BASE_URL = configuredApiUrl
  ? ensureApiSuffix(configuredApiUrl)
  : isDevelopment
    ? 'http://localhost:5000/api'
    : 'https://klpro-web.onrender.com/api';

export default API_BASE_URL;
