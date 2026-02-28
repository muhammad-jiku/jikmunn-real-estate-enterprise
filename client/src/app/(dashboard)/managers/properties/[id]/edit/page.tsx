'use client';

import { CustomFormField } from '@/components/shared/form/FormField';
import Header from '@/components/shared/Header';
import Loading from '@/components/shared/Loading';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from '@/lib/constants';
import { useGetAuthUserQuery, useGetPropertyQuery, useUpdatePropertyMutation } from '@/state/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Edit schema is more lenient - photos are optional since property already has them
const editPropertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  pricePerMonth: z.coerce.number().positive(),
  securityDeposit: z.coerce.number().positive(),
  applicationFee: z.coerce.number().positive(),
  isPetsAllowed: z.boolean(),
  isParkingIncluded: z.boolean(),
  photoUrls: z.array(z.instanceof(File)).optional(),
  amenities: z.array(z.string()).min(1, 'At least one amenity is required'),
  highlights: z.array(z.string()).min(1, 'At least one highlight is required'),
  beds: z.coerce.number().positive().max(10),
  baths: z.coerce.number().positive().max(10),
  squareFeet: z.coerce.number().positive(),
  propertyType: z.nativeEnum(PropertyTypeEnum),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
});

type _EditPropertyFormData = z.infer<typeof editPropertySchema>;

const EditProperty = () => {
  const { id } = useParams();
  const router = useRouter();
  const propertyId = Number(id);

  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const { data: property, isLoading: propertyLoading } = useGetPropertyQuery(propertyId);
  const [updateProperty, { isLoading: isUpdating }] = useUpdatePropertyMutation();
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  const form = useForm({
    resolver: zodResolver(editPropertySchema),
    defaultValues: {
      name: '',
      description: '',
      pricePerMonth: 1000,
      securityDeposit: 500,
      applicationFee: 100,
      isPetsAllowed: true,
      isParkingIncluded: true,
      photoUrls: [],
      amenities: [],
      highlights: [],
      beds: 1,
      baths: 1,
      squareFeet: 1000,
      propertyType: PropertyTypeEnum.Apartment,
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
  });

  // Populate form with existing property data
  useEffect(() => {
    if (property) {
      setExistingPhotos(property.photoUrls || []);

      // Handle amenities - can be string or array
      let amenitiesValue: string[] = [];
      if (Array.isArray(property.amenities)) {
        amenitiesValue = property.amenities;
      } else if (typeof property.amenities === 'string') {
        amenitiesValue = [property.amenities];
      }

      // Handle highlights - can be string or array
      let highlightsValue: string[] = [];
      if (Array.isArray(property.highlights)) {
        highlightsValue = property.highlights;
      } else if (typeof property.highlights === 'string') {
        highlightsValue = [property.highlights];
      }

      // Handle propertyType - ensure it matches enum key
      let propertyTypeValue = PropertyTypeEnum.Apartment;
      if (property.propertyType) {
        const ptVal = property.propertyType as string;
        // Check if it's a valid enum key
        if (Object.keys(PropertyTypeEnum).includes(ptVal)) {
          propertyTypeValue = ptVal as PropertyTypeEnum;
        }
      }

      form.reset({
        name: property.name,
        description: property.description,
        pricePerMonth: property.pricePerMonth,
        securityDeposit: property.securityDeposit,
        applicationFee: property.applicationFee,
        isPetsAllowed: property.isPetsAllowed,
        isParkingIncluded: property.isParkingIncluded,
        photoUrls: [],
        amenities: amenitiesValue,
        highlights: highlightsValue,
        beds: property.beds,
        baths: property.baths,
        squareFeet: property.squareFeet,
        propertyType: propertyTypeValue,
        address: property.location?.address || '',
        city: property.location?.city || '',
        state: property.location?.state || '',
        country: property.location?.country || '',
        postalCode: property.location?.postalCode || '',
      });
    }
  }, [property, form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    if (!authUser?.cognitoInfo?.userId) {
      throw new Error('No manager ID found');
    }

    // Verify ownership
    if (property?.manager?.cognitoId !== authUser.cognitoInfo.userId) {
      throw new Error('Not authorized to edit this property');
    }

    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'photoUrls') {
        const files = value as File[];
        if (files && files.length > 0) {
          files.forEach((file: File) => {
            formData.append('photos', file);
          });
        }
      } else if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    // Send existing photos to keep (after user may have removed some)
    formData.append('existingPhotos', JSON.stringify(existingPhotos));

    try {
      await updateProperty({ id: propertyId, data: formData });
      router.push('/managers/properties');
    } catch (error) {
      console.error('Failed to update property:', error);
    }
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Wait for both queries to finish loading
  if (propertyLoading || authLoading) return <Loading />;

  if (!property) {
    return (
      <div className="dashboard-container">
        <p>Property not found</p>
      </div>
    );
  }

  // Check ownership - only after both property and authUser are loaded
  if (
    !authUser?.cognitoInfo?.userId ||
    property.manager?.cognitoId !== authUser.cognitoInfo.userId
  ) {
    return (
      <div className="dashboard-container">
        <p>You are not authorized to edit this property</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Link
        href="/managers/properties"
        className="flex items-center mb-4 hover:text-primary-500"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to Properties</span>
      </Link>

      <Header title="Edit Property" subtitle="Update your property listing information" />
      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-10">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <CustomFormField name="name" label="Property Name" />
                <CustomFormField name="description" label="Description" type="textarea" />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Fees */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Fees</h2>
              <CustomFormField name="pricePerMonth" label="Price per Month" type="number" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField name="securityDeposit" label="Security Deposit" type="number" />
                <CustomFormField name="applicationFee" label="Application Fee" type="number" />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Property Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomFormField name="beds" label="Number of Beds" type="number" />
                <CustomFormField name="baths" label="Number of Baths" type="number" />
                <CustomFormField name="squareFeet" label="Square Feet" type="number" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CustomFormField name="isPetsAllowed" label="Pets Allowed" type="switch" />
                <CustomFormField name="isParkingIncluded" label="Parking Included" type="switch" />
              </div>
              <div className="mt-4">
                <CustomFormField
                  name="propertyType"
                  label="Property Type"
                  type="select"
                  options={Object.keys(PropertyTypeEnum).map((type) => ({
                    value: type,
                    label: type,
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Amenities and Highlights */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Amenities and Highlights</h2>
              <div className="space-y-6">
                <CustomFormField
                  name="amenities"
                  label="Amenities"
                  type="multi-select"
                  options={Object.keys(AmenityEnum).map((amenity) => ({
                    value: amenity,
                    label: amenity,
                  }))}
                />
                <CustomFormField
                  name="highlights"
                  label="Highlights"
                  type="multi-select"
                  options={Object.keys(HighlightEnum).map((highlight) => ({
                    value: highlight,
                    label: highlight,
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Current Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingPhotos.map((url, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={url}
                        alt={`Property photo ${index + 1}`}
                        width={200}
                        height={150}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">Remove</span>×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Photos */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Add New Photos</h2>
              <CustomFormField
                name="photoUrls"
                label="Property Photos (optional - will be added to existing)"
                type="file"
                accept="image/*"
              />
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Location Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Location Information</h2>
              <CustomFormField name="address" label="Address" />
              <div className="flex justify-between gap-4">
                <CustomFormField name="city" label="City" className="w-full" />
                <CustomFormField name="state" label="State" className="w-full" />
                <CustomFormField name="postalCode" label="Postal Code" className="w-full" />
              </div>
              <CustomFormField name="country" label="Country" />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/managers/properties')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-700 text-white flex-1"
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Property'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditProperty;
