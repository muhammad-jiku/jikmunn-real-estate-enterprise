import { useGetPropertyQuery } from '@/state/api';
import { Compass, MapPin } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

// Validate coordinates are within valid ranges
const isValidCoordinate = (lng: number | undefined | null, lat: number | undefined | null): boolean => {
  if (lng === undefined || lng === null || lat === undefined || lat === null) return false;
  if (lng === 0 && lat === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);
  const mapContainerRef = useRef(null);

  const hasValidCoordinates = property && isValidCoordinate(
    property.location?.coordinates?.longitude,
    property.location?.coordinates?.latitude
  );

  useEffect(() => {
    if (isLoading || isError || !property || !hasValidCoordinates) return;

    const lng = property.location?.coordinates?.longitude ?? 0;
    const lat = property.location?.coordinates?.latitude ?? 0;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      // style: 'mapbox://styles/muhammadjiku/cmdrd3kgo005701sh2c9m97nz', // minimo
      style: 'mapbox://styles/muhammadjiku/cmfdjt786008r01sd6aib5e48', // default
      center: [lng, lat],
      zoom: 14,
    });

    const marker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .addTo(map);

    const markerElement = marker.getElement();
    const path = markerElement.querySelector("path[fill='#3FB1CE']");
    if (path) path.setAttribute('fill', '#000000');

    return () => map.remove();
  }, [property, isError, isLoading, hasValidCoordinates]);

  if (isLoading) return (
    <div className='animate-pulse py-16'>
      <div className='h-6 bg-gray-200 rounded w-1/4 mb-4'></div>
      <div className='h-80 bg-gray-200 rounded-xl'></div>
    </div>
  );
  if (isError || !property) {
    return <>Property not Found</>;
  }

  return (
    <div className='py-16'>
      <h3 className='text-xl font-semibold text-primary-800 dark:text-primary-100'>
        Map and Location
      </h3>
      <div className='flex justify-between items-center text-sm text-primary-500 mt-2'>
        <div className='flex items-center text-gray-500'>
          <MapPin className='w-4 h-4 mr-1 text-gray-700' />
          Property Address:
          <span className='ml-2 font-semibold text-gray-700'>
            {property.location?.address || 'Address not available'}
          </span>
        </div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(
            property.location?.address || ''
          )}`}
          target='_blank'
          rel='noopener noreferrer'
          className='flex justify-between items-center hover:underline gap-2 text-primary-600'
        >
          <Compass className='w-5 h-5' />
          Get Directions
        </a>
      </div>
      <div
        className='relative mt-4 h-[300px] rounded-lg overflow-hidden'
        ref={mapContainerRef}
      />
    </div>
  );
};

export default PropertyLocation;
