const GEO_CACHE_PREFIX = 'klpro-geocode:';

const geocodeCache = new Map();

const normalizeText = (value) => String(value || '').trim();

export const formatAddress = (location) => {
  if (!location) return '';

  if (typeof location === 'string') {
    return normalizeText(location);
  }

  if (typeof location !== 'object') {
    return '';
  }

  const parts = [location.street, location.city, location.state, location.zipCode, location.address]
    .map(normalizeText)
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return '';
};

export const extractCoordinates = (location) => {
  if (!location || typeof location !== 'object') return null;

  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng ?? location.lon);

  // Validate coordinates: must not be NaN, 0, or null
  // Valid coordinates must be non-zero and not NaN
  if (Number.isNaN(latitude) || Number.isNaN(longitude) || latitude === 0 || longitude === 0) {
    return null;
  }

  return { latitude, longitude };
};

const readCache = (key) => {
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  try {
    const stored = localStorage.getItem(`${GEO_CACHE_PREFIX}${key}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    geocodeCache.set(key, parsed);
    return parsed;
  } catch (error) {
    return null;
  }
};

const writeCache = (key, value) => {
  geocodeCache.set(key, value);

  try {
    localStorage.setItem(`${GEO_CACHE_PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    // Ignore storage quota and privacy mode failures.
  }
};

export const geocodeLocation = async (location) => {
  const address = formatAddress(location);
  if (!address) return null;

  const cached = readCache(address.toLowerCase());
  if (cached) return cached;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to resolve map location');
  }

  const data = await response.json();
  const firstResult = Array.isArray(data) ? data[0] : null;
  if (!firstResult) return null;

  const coordinates = {
    latitude: Number(firstResult.lat),
    longitude: Number(firstResult.lon),
    label: firstResult.display_name || address,
  };

  writeCache(address.toLowerCase(), coordinates);
  return coordinates;
};

export const haversineDistanceKm = (origin, destination) => {
  if (!origin || !destination) return null;

  // Additional validation to ensure coordinates are valid numbers
  if (!Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude) || 
      !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

export const bearingDegrees = (origin, destination) => {
  if (!origin || !destination) return null;

  // Validate coordinates are actual numbers
  if (!Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude) || 
      !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const toDegrees = (radians) => (radians * 180) / Math.PI;

  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const theta = toDegrees(Math.atan2(y, x));

  return (theta + 360) % 360;
};

export const bearingToCompass = (degrees) => {
  if (degrees === null || degrees === undefined || Number.isNaN(Number(degrees))) return '';

  const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(Number(degrees) / 45) % 8;
  return compassPoints[index];
};

export const buildMapEmbedUrl = (origin, destination) => {
  if (!origin || !destination) return '';

  // Validate coordinates
  if (!Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude) || 
      !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) {
    return '';
  }

  const delta = 0.01;
  const midLatitude = (origin.latitude + destination.latitude) / 2;
  const midLongitude = (origin.longitude + destination.longitude) / 2;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${midLongitude - delta}%2C${midLatitude - delta}%2C${midLongitude + delta}%2C${midLatitude + delta}&layer=mapnik&marker=${midLatitude}%2C${midLongitude}`;
};

export const buildDirectionsUrl = (origin, destination) => {
  if (!origin || !destination) return '';

  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.latitude},${origin.longitude};${destination.latitude},${destination.longitude}`;
};
