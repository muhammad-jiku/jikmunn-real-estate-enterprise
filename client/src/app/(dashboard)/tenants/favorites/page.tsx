'use client';

import Card from '@/components/shared/card/Card';
import Header from '@/components/shared/Header';
import Loading from '@/components/shared/Loading';
import {
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetTenantQuery,
} from '@/state/api';

const Favorites = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: tenant } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || '',
    {
      skip: !authUser?.cognitoInfo?.userId,
    }
  );
  // console.log('tenant data in favorites page', tenant);

  const {
    data: favoriteProperties,
    isLoading,
    error,
  } = useGetPropertiesQuery(
    { favoriteIds: tenant?.favorites?.map((fav: { id: number }) => fav.id) },
    { skip: !tenant?.favorites || tenant?.favorites.length === 0 }
  );
  // console.log('favorite properties data', favoriteProperties);

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading favorites</div>;

  return (
    <div className='dashboard-container'>
      <Header
        title='Favorited Properties'
        subtitle='Browse and manage your saved property listings'
      />
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
        {favoriteProperties?.map((property) => (
          <Card
            key={property.id}
            property={property}
            isFavorite={true}
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/tenants/residences/${property.id}`}
          />
        ))}
      </div>
      {(!favoriteProperties || favoriteProperties.length === 0) && (
        <p>You don&lsquo;t have any favorited properties</p>
      )}
    </div>
  );
};

export default Favorites;
