import Card from '@/components/shared/card/Card';
import CardCompact from '@/components/shared/card/CardCompact';
import {
    useAddFavoritePropertyMutation,
    useGetAuthUserQuery,
    useGetPropertiesQuery,
    useGetTenantQuery,
    useRemoveFavoritePropertyMutation,
} from '@/state/api';
import { useAppSelector } from '@/state/redux';
import { Property } from '@/types/prismaTypes';

// Skeleton loading component for listings
const ListingSkeleton = () => (
  <div className='w-full'>
    <div className='h-5 w-32 bg-gray-200 rounded animate-pulse mx-4 mb-4' />
    <div className='p-4 w-full space-y-4'>
      {[1, 2, 3].map((i) => (
        <div key={i} className='bg-white rounded-xl overflow-hidden shadow-lg'>
          <div className='w-full h-48 bg-gray-200 animate-pulse' />
          <div className='p-4 space-y-3'>
            <div className='h-6 bg-gray-200 rounded w-3/4 animate-pulse' />
            <div className='h-4 bg-gray-200 rounded w-1/2 animate-pulse' />
            <div className='flex gap-4'>
              <div className='h-4 bg-gray-200 rounded w-16 animate-pulse' />
              <div className='h-4 bg-gray-200 rounded w-16 animate-pulse' />
              <div className='h-4 bg-gray-200 rounded w-16 animate-pulse' />
            </div>
            <div className='h-6 bg-gray-200 rounded w-24 animate-pulse' />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Listings = () => {
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const { data: tenant } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || '',
    {
      skip: !authUser?.cognitoInfo?.userId,
    }
  );

  const [addFavorite] = useAddFavoritePropertyMutation();
  const [removeFavorite] = useRemoveFavoritePropertyMutation();
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);

  const {
    data: properties,
    isLoading: propertiesLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  const handleFavoriteToggle = async (propertyId: number) => {
    if (!authUser) return;

    const isFavorite = tenant?.favorites?.some(
      (fav: Property) => fav.id === propertyId
    );

    if (isFavorite) {
      await removeFavorite({
        cognitoId: authUser.cognitoInfo.userId,
        propertyId,
      });
    } else {
      await addFavorite({
        cognitoId: authUser.cognitoInfo.userId,
        propertyId,
      });
    }
  };

  // Only show skeleton skeleton while loading properties (not auth)
  if (propertiesLoading) return <ListingSkeleton />;
  if (isError || !properties) return <div>Failed to fetch properties</div>;

  // Determine if user is signed in (but don't block on auth loading)
  const isSignedIn = !!authUser && !authLoading;

  return (
    <div className='w-full'>
      <h3 className='text-sm px-4 font-bold'>
        {properties.length}{' '}
        <span className='text-gray-700 font-normal'>
          Places in {filters.location}
        </span>
      </h3>
      <div className='flex'>
        <div className='p-4 w-full'>
          {properties?.map((property) =>
            viewMode === 'grid' ? (
              <Card
                key={property.id}
                property={property}
                isFavorite={
                  tenant?.favorites?.some(
                    (fav: Property) => fav.id === property.id
                  ) || false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={isSignedIn}
                propertyLink={`/search/${property.id}`}
              />
            ) : (
              <CardCompact
                key={property.id}
                property={property}
                isFavorite={
                  tenant?.favorites?.some(
                    (fav: Property) => fav.id === property.id
                  ) || false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={isSignedIn}
                propertyLink={`/search/${property.id}`}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Listings;
