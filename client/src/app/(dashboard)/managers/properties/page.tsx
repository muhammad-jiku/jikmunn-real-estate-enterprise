'use client';

import Card from '@/components/shared/card/Card';
import Header from '@/components/shared/Header';
import Loading from '@/components/shared/Loading';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useDeletePropertyMutation,
  useGetAuthUserQuery,
  useGetManagerPropertiesQuery,
} from '@/state/api';
import { Property } from '@/types/prismaTypes';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const Properties = () => {
  const router = useRouter();
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: managerProperties,
    isLoading,
    error,
  } = useGetManagerPropertiesQuery(authUser?.cognitoInfo?.userId || '', {
    skip: !authUser?.cognitoInfo?.userId,
  });

  const [deleteProperty] = useDeletePropertyMutation();
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (propertyId: number) => {
    router.push(`/managers/properties/${propertyId}/edit`);
  };

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
  };

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProperty(propertyToDelete.id);
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Failed to delete property:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading manager properties</div>;

  return (
    <div className="dashboard-container">
      <Header title="My Properties" subtitle="View and manage your property listings" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.isArray(managerProperties) &&
          managerProperties.map((property) => (
            <Card
              key={property.id}
              property={property}
              isFavorite={false}
              onFavoriteToggle={() => {}}
              showFavoriteButton={false}
              propertyLink={`/managers/properties/${property.id}`}
              showEditDelete={true}
              onEdit={() => handleEdit(property.id)}
              onDelete={() => handleDeleteClick(property)}
            />
          ))}
      </div>
      {(!Array.isArray(managerProperties) || managerProperties.length === 0) && (
        <p>You don&lsquo;t manage any properties</p>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!propertyToDelete} onOpenChange={() => setPropertyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{propertyToDelete?.name}&quot;? This action
              cannot be undone.
              {propertyToDelete && (
                <span className="block mt-2 text-amber-600">
                  Note: Properties with active leases cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Properties;
