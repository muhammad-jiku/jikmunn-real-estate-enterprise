/* eslint-disable react-hooks/preserve-manual-memoization */
'use client';

import { PropertyReviews } from '@/components/property/PropertyReviews';
import ApplicationModal from '@/components/search/ApplicationModal';
import { ApprovedTenantPayment } from '@/components/search/ApprovedTenantPayment';
import ContactWidget from '@/components/search/ContactWidget';
import ImagePreviews from '@/components/search/ImagePreviews';
import PropertyDetails from '@/components/search/PropertyDetails';
import PropertyLocation from '@/components/search/PropertyLocation';
import PropertyOverview from '@/components/search/PropertyOverview';
import Loading from '@/components/shared/Loading';
import { useGetAuthUserQuery, useGetPropertyQuery } from '@/state/api';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const SingleListing = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property, isLoading } = useGetPropertyQuery(propertyId);

  const imageUrls = useMemo(() => {
    // Use property's photoUrls if available, otherwise fallback to placeholder
    const photos =
      property?.photoUrls && property.photoUrls.length > 0
        ? property.photoUrls
        : ['/placeholder.jpg'];

    return photos.map((url) => ({
      primary: url,
      fallback: '/placeholder.jpg',
    }));
  }, [property?.photoUrls]);

  if (isLoading) return <Loading />;

  return (
    <div>
      <ImagePreviews images={imageUrls} />
      <div className="flex flex-col md:flex-row justify-center gap-10 mx-10 md:w-2/3 md:mx-auto mt-16 mb-8">
        <div className="order-2 md:order-1">
          <PropertyOverview propertyId={propertyId} />
          <PropertyDetails propertyId={propertyId} />
          <PropertyLocation propertyId={propertyId} />

          {/* Reviews Section */}
          <div className="mt-8">
            <PropertyReviews propertyId={propertyId} />
          </div>
        </div>

        <div className="order-1 md:order-2 space-y-4">
          {/* Payment widget for approved tenants */}
          <ApprovedTenantPayment propertyId={propertyId} />

          <ContactWidget onOpenModal={() => setIsModalOpen(true)} propertyId={propertyId} />
        </div>
      </div>

      {authUser && (
        <ApplicationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          propertyId={propertyId}
        />
      )}
    </div>
  );
};

export default SingleListing;
