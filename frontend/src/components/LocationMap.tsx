import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (lat: number, lng: number) => void;
  height?: string;
  readOnly?: boolean;
}

// Custom pin icon using Leaflet DivIcon for sharp SVG/HTML marker
const createPinIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-pin-icon',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background-color: #0284c7;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  onLocationChange,
  height = '240px',
  readOnly = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([latitude, longitude], {
        icon: createPinIcon(),
        draggable: !readOnly && !!onLocationChange,
      }).addTo(map);

      if (!readOnly && onLocationChange) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          onLocationChange(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 16);
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude, readOnly, onLocationChange]);

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
      {!readOnly && onLocationChange && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          color: 'white',
          padding: '0.35rem 0.85rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(4px)',
        }}>
          📍 Click or drag pin to adjust location
        </div>
      )}
    </div>
  );
};
