import Card from '@/components/shared/card/Card';
import CardCompact from '@/components/shared/card/CardCompact';
import { useGetPropertiesQuery } from '@/state/api';
import { useAppSelector } from '@/state/redux';

const Listings = () => {
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);

  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  const handleFavoriteToggle = async (propertyId: number) => {
    console.log('Toggling favorite for property:', propertyId);
  };

  if (isLoading) return <>Loading...</>;
  if (isError || !properties) return <div>Failed to fetch properties</div>;

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
                  //   tenant?.favorites?.some(
                  //     (fav: Property) => fav.id === property.id
                  //     ) ||
                  false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                // showFavoriteButton={!!authUser}
                propertyLink={`/search/${property.id}`}
              />
            ) : (
              <CardCompact
                key={property.id}
                property={property}
                isFavorite={
                  //   tenant?.favorites?.some(
                  //     (fav: Property) => fav.id === property.id
                  //     ) ||
                  false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                // showFavoriteButton={!!authUser}
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
