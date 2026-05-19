import React, { useEffect, useMemo, useState } from 'react';
import {
  bearingDegrees,
  bearingToCompass,
  buildMapEmbedUrl,
  extractCoordinates,
  formatAddress,
  geocodeLocation,
  haversineDistanceKm,
} from '../utils/bookingLocation';

const BookingRouteCard = ({ title, originLocation, destinationLocation, originLabel, destinationLabel }) => {
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const originText = useMemo(() => formatAddress(originLocation), [originLocation]);
  const destinationText = useMemo(() => formatAddress(destinationLocation), [destinationLocation]);

  useEffect(() => {
    let active = true;

    const loadCoordinates = async () => {
      setLoading(true);
      setError('');

      try {
        const resolvedOrigin = extractCoordinates(originLocation) || (originText ? await geocodeLocation(originText) : null);
        const resolvedDestination = extractCoordinates(destinationLocation) || (destinationText ? await geocodeLocation(destinationText) : null);

        if (!active) return;
        setOriginCoords(resolvedOrigin);
        setDestinationCoords(resolvedDestination);
      } catch (coordinateError) {
        if (!active) return;
        setError('Map route is temporarily unavailable for this booking.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (originLocation && destinationLocation) {
      loadCoordinates();
    } else {
      setLoading(false);
      setOriginCoords(null);
      setDestinationCoords(null);
    }

    return () => {
      active = false;
    };
  }, [destinationLocation, destinationText, originLocation, originText]);

  const distanceKm = useMemo(() => haversineDistanceKm(originCoords, destinationCoords), [originCoords, destinationCoords]);
  const directionDegrees = useMemo(() => bearingDegrees(originCoords, destinationCoords), [originCoords, destinationCoords]);
  const compassDirection = bearingToCompass(directionDegrees);
  const mapEmbedUrl = buildMapEmbedUrl(originCoords, destinationCoords);

  if (!originLocation || !destinationLocation) return null;

  return (
    <div
      className="booking-route-card"
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,248,255,0.96))',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div className="booking-route-card__header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0 }}>{title}</h4>
        <span style={{ fontSize: 13, color: '#475569' }}>
          {loading ? 'Loading route...' : distanceKm !== null ? `Approx. ${distanceKm.toFixed(1)} km away` : 'Distance unavailable'}
        </span>
      </div>

      <div className="booking-route-card__summary" style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <p style={{ margin: 0 }}><strong>{originLabel}:</strong> {originText || 'Live location'}</p>
        <p style={{ margin: 0 }}><strong>{destinationLabel}:</strong> {destinationText || 'Pending address'}</p>
        {!loading && distanceKm !== null && compassDirection && (
          <p style={{ margin: 0 }}><strong>Direction:</strong> {compassDirection}{directionDegrees !== null ? ` (${Math.round(directionDegrees)}°)` : ''}</p>
        )}
      </div>

      {mapEmbedUrl && (
        <div className="booking-route-card__map" style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(148, 163, 184, 0.35)' }}>
          <iframe
            title={title}
            src={mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ width: '100%', height: 280, border: 0, display: 'block' }}
          />
        </div>
      )}

      {error && <p className="booking-route-card__error" style={{ marginTop: 10, color: '#b42318' }}>{error}</p>}
    </div>
  );
};

export default BookingRouteCard;