'use client';

import ApplicationModal from '@/components/search/ApplicationModal';
import ContactWidget from '@/components/search/ContactWidget';
import ImagePreviews from '@/components/search/ImagePreviews';
import PropertyDetails from '@/components/search/PropertyDetails';
import PropertyLocation from '@/components/search/PropertyLocation';
import PropertyOverview from '@/components/search/PropertyOverview';
import { useGetAuthUserQuery } from '@/state/api';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const SingleListing = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: authUser } = useGetAuthUserQuery();

  const imageUrls = useMemo(() => {
    const s3Images = [
      'https://jikmunn-real-estate-enterprise-s3-images.s3.ap-southeast-1.amazonaws.com/singlelisting-2.jpg',
      'https://jikmunn-real-estate-enterprise-s3-images.s3.ap-southeast-1.amazonaws.com/singlelisting-3.jpg',
    ];
    const fallbackImages = ['/singlelisting-2.jpg', '/singlelisting-3.jpg'];

    return s3Images.map((s3Url, index) => ({
      primary: s3Url,
      fallback: fallbackImages[index],
    }));
  }, []);

  return (
    <div>
      <ImagePreviews images={imageUrls} />
      <div className='flex flex-col md:flex-row justify-center gap-10 mx-10 md:w-2/3 md:mx-auto mt-16 mb-8'>
        <div className='order-2 md:order-1'>
          <PropertyOverview propertyId={propertyId} />
          <PropertyDetails propertyId={propertyId} />
          <PropertyLocation propertyId={propertyId} />
        </div>

        <div className='order-1 md:order-2'>
          <ContactWidget onOpenModal={() => setIsModalOpen(true)} />
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
