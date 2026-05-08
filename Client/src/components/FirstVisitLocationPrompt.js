import React, { useState, useEffect, useRef } from 'react';
import LocationPopup from './LocationPopup';

const FirstVisitLocationPrompt = () => {
  const [showLocationPopup, setShowLocationPopup] = useState(false);

  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const storedLocation = localStorage.getItem('userPreferredLocation');

    if (storedLocation && storedLocation.trim()) {
      return undefined;
    }

    timeoutRef.current = setTimeout(() => {
      setShowLocationPopup(true);
    }, 2000); // 2 second delay for first prompt

    intervalRef.current = setInterval(() => {
      setShowLocationPopup(true);
    }, 10 * 60 * 1000); // repeat every 10 minutes

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleLocationUpdate = (newLocation) => {
    localStorage.setItem('userPreferredLocation', newLocation);
    setShowLocationPopup(false);
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
    console.log('Location set to:', newLocation);
  };

  const handleClose = () => {
    setShowLocationPopup(false);
  };

  return (
    <LocationPopup
      isOpen={showLocationPopup}
      onClose={handleClose}
      onLocationUpdate={handleLocationUpdate}
      autoShow={true}
      onAutoClose={handleClose}
    />
  );
};

export default FirstVisitLocationPrompt;