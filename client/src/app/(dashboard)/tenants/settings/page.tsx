'use client';

import Loading from '@/components/shared/Loading';
import SettingsForm from '@/components/shared/form/SettingsForm';
import {
    useGetAuthUserQuery,
    useUpdateTenantSettingsMutation,
} from '@/state/api';

const TenantSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateTenant] = useUpdateTenantSettingsMutation();

  if (isLoading) return <Loading />;
  if (!authUser?.cognitoInfo?.userId) return <Loading />;

  const initialData = {
    name: authUser?.userInfo.name,
    email: authUser?.userInfo.email,
    phoneNumber: authUser?.userInfo.phoneNumber,
  };

  const handleSubmit = async (data: typeof initialData) => {
    await updateTenant({
      cognitoId: authUser.cognitoInfo.userId,
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
