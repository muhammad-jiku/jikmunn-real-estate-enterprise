'use client';

import SettingsForm from '@/components/shared/form/SettingsForm';
import {
  useGetAuthUserQuery,
  useUpdateManagerSettingsMutation,
} from '@/state/api';

const ManagerSettings = () => {
  const { data: authUser, isLoading } = useGetAuthUserQuery();
  const [updateManager] = useUpdateManagerSettingsMutation();

  if (isLoading) return <>Loading...</>;

  const initialData = {
    name: authUser?.userInfo.name,
    email: authUser?.userInfo.email,
    phoneNumber: authUser?.userInfo.phoneNumber,
  };
  console.log('initial data in manager settings', initialData);

  const handleSubmit = async (data: typeof initialData) => {
    console.log('submitting manager settings data', data);
    await updateManager({
      cognitoId: authUser?.cognitoInfo?.userId,
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
