'use client';

import Card from '@/components/shared/card/Card';
import Header from '@/components/shared/Header';
import Loading from '@/components/shared/Loading';
import {
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetTenantQuery,
  useRemoveFavoritePropertyMutation,
} from '@/state/api';

const Favorites = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: tenant } = useGetTenantQuery(authUser?.cognitoInfo?.userId || '', {
    skip: !authUser?.cognitoInfo?.userId,
  });
  const [removeFavorite] = useRemoveFavoritePropertyMutation();

  const {
    data: favoriteProperties,
    isLoading,
    error,
  } = useGetPropertiesQuery(
    {
      // Use favoritePropertyIds from server DTO, fallback to favorites array for backwards compatibility
      favoriteIds:
        tenant?.favoritePropertyIds || tenant?.favorites?.map((fav: { id: number }) => fav.id),
    },
    {
      skip:
        !tenant ||
        ((!tenant.favoritePropertyIds || tenant.favoritePropertyIds.length === 0) &&
          (!tenant.favorites || tenant.favorites.length === 0)),
    }
  );

  const handleRemoveFavorite = async (propertyId: number) => {
    if (!authUser?.cognitoInfo?.userId) return;
    await removeFavorite({
      cognitoId: authUser.cognitoInfo.userId,
      propertyId,
    });
  };

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading favorites</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="Favorited Properties"
        subtitle="Browse and manage your saved property listings"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.isArray(favoriteProperties) &&
          favoriteProperties.map((property) => (
            <Card
              key={property.id}
              property={property}
              isFavorite={true}
              onFavoriteToggle={() => handleRemoveFavorite(property.id)}
              showFavoriteButton={true}
              propertyLink={`/tenants/residences/${property.id}`}
            />
          ))}
      </div>
      {(!Array.isArray(favoriteProperties) || favoriteProperties.length === 0) && (
        <p>You don&lsquo;t have any favorited properties</p>
      )}
    </div>
  );
};

export default Favorites;
