'use client';

import ApplicationModal from '@/components/search/ApplicationModal';
import ContactWidget from '@/components/search/ContactWidget';
import ImagePreviews from '@/components/search/ImagePreviews';
import PropertyDetails from '@/components/search/PropertyDetails';
import PropertyLocation from '@/components/search/PropertyLocation';
import PropertyOverview from '@/components/search/PropertyOverview';
import { useParams } from 'next/navigation';
import { useState } from 'react';

const SingleListing = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <ImagePreviews
        images={['/singlelisting-2.jpg', '/singlelisting-3.jpg']}
      />
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

      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        propertyId={propertyId}
      />
    </div>
  );
};

export default SingleListing;
