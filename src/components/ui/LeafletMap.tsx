"use client";

import React, { useEffect, useRef, useState } from 'react';

interface LeafletMapProps {
  providerLat: number;
  providerLng: number;
  customerLat: number;
  customerLng: number;
  orderId: string;
}

export function LeafletMap({ providerLat, providerLng, customerLat, customerLng, orderId }: LeafletMapProps) {
  const mapContainerId = `map-${orderId}`;
  const mapRef = useRef<any>(null);
  const markerProviderRef = useRef<any>(null);
  const markerCustomerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Dynamically load Leaflet CDN assets safely
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setMapLoaded(true);
      document.body.appendChild(script);
    } else {
      if ((window as any).L) {
        setMapLoaded(true);
      } else {
        const interval = setInterval(() => {
          if ((window as any).L) {
            setMapLoaded(true);
            clearInterval(interval);
          }
        }, 100);
      }
    }
  }, []);

  const boundsFitRef = useRef(false);

  // Reset bounds fit when order ID changes
  useEffect(() => {
    boundsFitRef.current = false;
  }, [orderId]);

  // 2. Initialize Leaflet Map (Only once when container is ready)
  useEffect(() => {
    if (!mapLoaded || typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L) return;

    const container = document.getElementById(mapContainerId);
    if (!container) return;

    // Initialize Map if not already created
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerId, {
        zoomControl: true,
        attributionControl: false
      }).setView([providerLat, providerLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Fix leaflet map sizing bug when loaded dynamically
    const timeoutId = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Leaflet cleanup warning:', e);
        }
        mapRef.current = null;
        markerProviderRef.current = null;
        markerCustomerRef.current = null;
        polylineRef.current = null;
      }
    };
  }, [mapLoaded, mapContainerId]);

  // 3. Update Markers, Route line, and Boundaries on Coordinate updates
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L) return;

    const map = mapRef.current;

    // Define beautiful custom HTML div icons for Swiggy/Zomato style markers
    const providerIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-primary/30 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center text-sm">
            🛵
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const customerIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-green-500/30 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-green-600 border-2 border-white shadow-lg flex items-center justify-center text-sm">
            🏠
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Add or Update Provider Marker
    if (markerProviderRef.current) {
      markerProviderRef.current.setLatLng([providerLat, providerLng]);
    } else {
      markerProviderRef.current = L.marker([providerLat, providerLng], { icon: providerIcon })
        .addTo(map)
        .bindPopup("<b>You (Provider)</b><br/>🛵 Heading to customer");
    }

    // Add or Update Customer Marker
    if (markerCustomerRef.current) {
      markerCustomerRef.current.setLatLng([customerLat, customerLng]);
    } else {
      markerCustomerRef.current = L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup("<b>Customer</b><br/>🏠 Delivery location");
    }

    // Draw/Update route connecting provider and customer
    const pathCoordinates = [
      [providerLat, providerLng],
      [customerLat, customerLng]
    ];
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(pathCoordinates);
    } else {
      polylineRef.current = L.polyline(pathCoordinates, {
        color: '#ff5a5f',
        weight: 4,
        dashArray: '5, 10',
        opacity: 0.85
      }).addTo(map);
    }

    // Adjust camera boundaries to fit both pins beautifully ONCE on coordinate load
    if (!boundsFitRef.current && providerLat && providerLng && customerLat && customerLng) {
      try {
        const bounds = L.latLngBounds([
          [providerLat, providerLng],
          [customerLat, customerLng]
        ]);
        map.fitBounds(bounds, { padding: [40, 40] });
        boundsFitRef.current = true;
      } catch (e) {
        console.warn('Map fit bounds failed:', e);
      }
    }
  }, [mapLoaded, providerLat, providerLng, customerLat, customerLng]);

  return (
    <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-border shadow-md">
      <div id={mapContainerId} className="w-full h-full" style={{ background: '#f8f9fa' }} />
      <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-foreground border border-border flex items-center gap-1.5 shadow-sm z-[999]">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
        Live Tracking (OSM)
      </div>
    </div>
  );
}
