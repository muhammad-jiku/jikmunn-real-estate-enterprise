/* eslint-disable @typescript-eslint/no-explicit-any */
import { clsx, type ClassValue } from 'clsx';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEnumString(str: string) {
  return str.replace(/([A-Z])/g, ' $1').trim();
}

export function formatPriceValue(value: number | null, isMin: boolean) {
  if (value === null || value === 0)
    return isMin ? 'Any Min Price' : 'Any Max Price';
  if (value >= 1000) {
    const kValue = value / 1000;
    return isMin ? `$${kValue}k+` : `<$${kValue}k`;
  }
  return isMin ? `$${value}+` : `<$${value}`;
}

export function cleanParams(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([_, value]) =>
        value !== undefined &&
        value !== 'any' &&
        value !== '' &&
        (Array.isArray(value) ? value.some((v) => v !== null) : value !== null)
    )
  );
}

type MutationMessages = {
  success?: string;
  error: string;
};

export const withToast = async <T>(
  mutationFn: Promise<T>,
  messages: Partial<MutationMessages>
) => {
  const { success, error } = messages;

  try {
    const result = await mutationFn;
    if (success) toast.success(success);
    return result;
  } catch (err) {
    if (error) toast.error(error);
    throw err;
  }
};

export const createNewUserInDatabase = async (
  user: any,
  idToken: any,
  userRole: string,
  fetchWithBQ: any
) => {
  const normalizedRole = userRole?.toLowerCase();
  const createEndpoint = normalizedRole === 'manager' ? '/managers' : '/tenants';

  const requestBody = {
    cognitoId: user.userId,
    name: user.username,
    email: idToken?.payload?.email || '',
    phoneNumber: '',
  };

  // Log the creation attempt for debugging
  console.log(`[createNewUserInDatabase] Creating ${normalizedRole} user:`, {
    endpoint: createEndpoint,
    cognitoId: requestBody.cognitoId,
    name: requestBody.name,
    email: requestBody.email,
  });

  // Validate required fields before sending
  if (!requestBody.cognitoId) {
    const error = 'Missing cognitoId - user.userId is undefined';
    console.error(`[createNewUserInDatabase] ${error}`);
    throw new Error(error);
  }

  if (!requestBody.name) {
    const error = 'Missing name - user.username is undefined';
    console.error(`[createNewUserInDatabase] ${error}`);
    throw new Error(error);
  }

  try {
    const createUserResponse = await fetchWithBQ({
      url: createEndpoint,
      method: 'POST',
      body: requestBody,
    });

    if (createUserResponse.error) {
      console.error('[createNewUserInDatabase] API error:', createUserResponse.error);
      const errorMessage = createUserResponse.error?.data?.message || 
                          createUserResponse.error?.error || 
                          'Failed to create user record';
      throw new Error(errorMessage);
    }

    console.log('[createNewUserInDatabase] User created successfully:', createUserResponse.data);
    return createUserResponse;
  } catch (error: any) {
    console.error('[createNewUserInDatabase] Exception:', error);
    throw error;
  }
};
