import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

function AnalyticsRouteTracker() {
  const location = useLocation();
  const lastTrackedPath = useRef(null);

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}`;
    if (lastTrackedPath.current === pagePath) return;

    lastTrackedPath.current = pagePath;
    trackPageView({ pagePath, pageTitle: document.title });
  }, [location.pathname, location.search]);

  return null;
}

export default AnalyticsRouteTracker;
