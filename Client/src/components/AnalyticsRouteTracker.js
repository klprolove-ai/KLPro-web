import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackMetaPageView, trackPageView } from '../utils/analytics';

function AnalyticsRouteTracker() {
  const location = useLocation();
  const lastTrackedPath = useRef(null);
  const isInitialPageView = useRef(true);

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}`;
    if (lastTrackedPath.current === pagePath) return;

    lastTrackedPath.current = pagePath;
    trackPageView({ pagePath, pageTitle: document.title });

    if (isInitialPageView.current) {
      isInitialPageView.current = false;
      return;
    }

    trackMetaPageView();
  }, [location.pathname, location.search]);

  return null;
}

export default AnalyticsRouteTracker;
