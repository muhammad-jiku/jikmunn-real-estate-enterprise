/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useGetPropertiesQuery } from '@/state/api';
import { useAppSelector } from '@/state/redux';
import { Property } from '@/types/prismaTypes';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

// Validate coordinates are within valid ranges
const isValidCoordinate = (
  lng: number | undefined | null,
  lat: number | undefined | null
): boolean => {
  if (lng === undefined || lng === null || lat === undefined || lat === null) return false;
  if (lng === 0 && lat === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

const Map = () => {
  const mapContainerRef = useRef(null);
  const filters = useAppSelector((state) => state.global.filters);
  const { data: properties, isLoading, isError } = useGetPropertiesQuery(filters);

  useEffect(() => {
    if (isLoading || isError || !properties) return;

    // Validate filters.coordinates before using them
    let mapCenter: [number, number] = [-74.5, 40]; // Default NYC area
    if (filters.coordinates && isValidCoordinate(filters.coordinates[0], filters.coordinates[1])) {
      mapCenter = filters.coordinates;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: 'mapbox://styles/muhammadjiku/cmdrd3kgo005701sh2c9m97nz', // minimo
      // style: 'mapbox://styles/muhammadjiku/cmfdjt786008r01sd6aib5e48', // default
      center: mapCenter,
      zoom: 9,
    });

    properties.forEach((property) => {
      // Skip properties with invalid coordinates
      const lng = property.location?.coordinates?.longitude;
      const lat = property.location?.coordinates?.latitude;
      if (!isValidCoordinate(lng, lat)) return;

      const marker = createPropertyMarker(property, map);
      const markerElement = marker.getElement();
      const path = markerElement.querySelector("path[fill='#3FB1CE']");
      if (path) path.setAttribute('fill', '#000000');
    });

    const resizeMap = () => {
      if (map) setTimeout(() => map.resize(), 700);
    };
    resizeMap();

    return () => map.remove();
  }, [isLoading, isError, properties, filters.coordinates]);

  if (isLoading)
    return (
      <div className="basis-5/12 grow relative rounded-xl bg-gray-100 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          <div className="h-4 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
    );
  if (isError || !properties) return <div>Failed to fetch properties</div>;

  return (
    <div className="basis-5/12 grow relative rounded-xl">
      <div
        className="map-container rounded-xl"
        ref={mapContainerRef}
        style={{
          height: '100%',
          width: '100%',
        }}
      />
    </div>
  );
};

const createPropertyMarker = (property: Property, map: mapboxgl.Map) => {
  const marker = new mapboxgl.Marker()
    .setLngLat([
      (property as any).location?.coordinates?.longitude ?? 0,
      (property as any).location?.coordinates?.latitude ?? 0,
    ])
    .setPopup(
      new mapboxgl.Popup().setHTML(
        `
        <div class="marker-popup">
          <div class="marker-popup-image"></div>
          <div>
            <a href="/search/${property.id}" target="_blank" class="marker-popup-title">${property.name}</a>
            <p class="marker-popup-price">
              $${property.pricePerMonth}
              <span class="marker-popup-price-unit"> / month</span>
            </p>
          </div>
        </div>
        `
      )
    )
    .addTo(map);

  return marker;
};

export default Map;
