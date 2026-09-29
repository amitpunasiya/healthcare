import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProviderDestinationMapProps {
  customerLat: number;
  customerLng: number;
  customerAddressLabel?: string;
  providerLat?: number;
  providerLng?: number;
  height?: string;
}

// Red/Blue customer pin icon
const createCustomerPinIcon = () => {
  return L.divIcon({
    className: 'custom-customer-pin-icon',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background-color: #ef4444;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

// Green provider pin icon
const createProviderPinIcon = () => {
  return L.divIcon({
    className: 'custom-provider-pin-icon',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background-color: #10b981;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

export const ProviderDestinationMap: React.FC<ProviderDestinationMapProps> = ({
  customerLat,
  customerLng,
  customerAddressLabel = 'Customer Destination',
  providerLat,
  providerLng,
  height = '260px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [customerLat, customerLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add Customer Marker
    const customerMarker = L.marker([customerLat, customerLng], {
      icon: createCustomerPinIcon(),
    }).addTo(map);

    customerMarker.bindPopup(`<strong>📍 ${customerAddressLabel}</strong>`).openPopup();

    // Add Provider Marker if available
    if (providerLat !== undefined && providerLng !== undefined) {
      const providerMarker = L.marker([providerLat, providerLng], {
        icon: createProviderPinIcon(),
      }).addTo(map);

      providerMarker.bindPopup('<strong>📍 My Location</strong>');

      // Fit map bounds to show both markers
      const bounds = L.latLngBounds(
        [customerLat, customerLng],
        [providerLat, providerLng]
      );
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    } else {
      map.setView([customerLat, customerLng], 15);
    }
  }, [customerLat, customerLng, customerAddressLabel, providerLat, providerLng]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height }} />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        color: 'white',
        padding: '0.35rem 0.75rem',
        borderRadius: '8px',
        fontSize: '0.725rem',
        fontWeight: 700,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
          Customer
        </span>
        {providerLat !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            You
          </span>
        )}
      </div>
    </div>
  );
};
