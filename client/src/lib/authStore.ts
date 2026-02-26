// Token store for RTK Query
// This allows us to share the Clerk token between React components and RTK Query

let authToken: string | null = null;
let getTokenFn: (() => Promise<string | null>) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = (): string | null => {
  return authToken;
};

// Store the getToken function from Clerk for fresh token requests
export const setGetTokenFn = (fn: () => Promise<string | null>) => {
  getTokenFn = fn;
};

// Get a fresh token - use this for API requests
export const getFreshToken = async (): Promise<string | null> => {
  if (getTokenFn) {
    try {
      const freshToken = await getTokenFn();
      authToken = freshToken;
      return freshToken;
    } catch {
      return authToken;
    }
  }
  return authToken;
};

// User info cache for RTK Query
interface CachedUserInfo {
  userId: string;
  role: string;
  email: string;
  name: string;
}

let cachedUserInfo: CachedUserInfo | null = null;

export const setCachedUserInfo = (info: CachedUserInfo | null) => {
  cachedUserInfo = info;
};

export const getCachedUserInfo = (): CachedUserInfo | null => {
  return cachedUserInfo;
};
