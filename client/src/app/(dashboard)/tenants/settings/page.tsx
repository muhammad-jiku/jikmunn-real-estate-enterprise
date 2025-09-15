'use client';

import SettingsForm from '@/components/shared/form/SettingsForm';
import {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
} from '@/state/api';

const TenantSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateTenant] = useUpdateTenantSettingsMutation();

  if (isLoading) return <>Loading...</>;

  const initialData = {
    name: authUser?.userInfo.name,
    email: authUser?.userInfo.email,
    phoneNumber: authUser?.userInfo.phoneNumber,
  };
  // console.log('initial data in tenant settings', initialData);

  const handleSubmit = async (data: typeof initialData) => {
    // console.log('data to submit in tenant settings', data);
    await updateTenant({
      cognitoId: authUser?.cognitoInfo?.userId,
      ...data,
    });
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      userType='tenant'
    />
  );
};

export default TenantSettings;
