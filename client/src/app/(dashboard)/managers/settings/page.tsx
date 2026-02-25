'use client';

import Loading from '@/components/shared/Loading';
import SettingsForm from '@/components/shared/form/SettingsForm';
import {
    useGetAuthUserQuery,
    useUpdateManagerSettingsMutation,
} from '@/state/api';

const ManagerSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateManager] = useUpdateManagerSettingsMutation();

  if (isLoading) return <Loading />;
  if (!authUser?.cognitoInfo?.userId) return <Loading />;

  const initialData = {
    name: authUser?.userInfo.name,
    email: authUser?.userInfo.email,
    phoneNumber: authUser?.userInfo.phoneNumber,
  };

  const handleSubmit = async (data: typeof initialData) => {
    await updateManager({
      cognitoId: authUser.cognitoInfo.userId,
      ...data,
    });
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      userType='manager'
    />
  );
};

export default ManagerSettings;
