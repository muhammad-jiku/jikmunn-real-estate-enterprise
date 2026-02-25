/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanParams, createNewUserInDatabase, withToast } from '@/lib/utils';
import
  {
    Manager,
    Payment,
    Property,
    Tenant
  } from '@/types/prismaTypes';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { FiltersState } from '.';

// New types for added features
export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  propertyId: number;
  tenantCognitoId: string;
  createdAt: string;
  updatedAt: string;
  property?: Property;
  tenant?: Tenant;
}

export interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  attachments: string[];
  resolution: string | null;
  propertyId: number;
  tenantCognitoId: string;
  createdAt: string;
  updatedAt: string;
  property?: Property;
  tenant?: Tenant;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  relatedEntityId: number | null;
  relatedEntityType: string | null;
  userCognitoId: string;
  userType: 'tenant' | 'manager';
  createdAt: string;
}

export interface Message {
  id: number;
  content: string;
  propertyId: number | null;
  senderCognitoId: string;
  senderType: 'tenant' | 'manager';
  receiverCognitoId: string;
  receiverType: 'tenant' | 'manager';
  createdAt: string;
  property?: Property;
}

export interface Conversation {
  partnerId: string;
  partnerType: 'tenant' | 'manager';
  partnerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      try {
        const session = await fetchAuthSession();
        const { idToken } = session.tokens ?? {};
        if (idToken) {
          headers.set('Authorization', `Bearer ${idToken}`);
        }
      } catch {
        // User not authenticated - continue without auth header for public endpoints
      }
      return headers;
    },
  }),
  reducerPath: 'api',
  tagTypes: [
    'Managers',
    'Tenants',
    'Properties',
    'PropertyDetails',
    'Leases',
    'Payments',
    'Applications',
    'Reviews',
    'Maintenance',
    'Notifications',
    'Messages',
  ],
  endpoints: (build) => ({
    getAuthUser: build.query<User, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          
          // No token means user is not authenticated
          if (!idToken) {
            return { error: 'Not authenticated' };
          }
          
          const user = await getCurrentUser();
          const userRole = idToken?.payload['custom:role'] as string;

          console.log('[getAuthUser] Fetching user:', {
            userId: user.userId,
            username: user.username,
            userRole,
          });

          // Validate userRole exists
          if (!userRole) {
            console.error('[getAuthUser] No userRole found in token');
            return { error: 'User role not found. Please sign out and sign in again.' };
          }

          // Use case-insensitive comparison for role
          const normalizedRole = userRole.toLowerCase();
          const endpoint =
            normalizedRole === 'manager'
              ? `/managers/${user.userId}`
              : `/tenants/${user.userId}`;

          console.log('[getAuthUser] Fetching from endpoint:', endpoint);
          let userDetailsResponse = await fetchWithBQ(endpoint);

          // if user doesn't exist, create new user
          if (
            userDetailsResponse.error &&
            (userDetailsResponse.error as any).status === 404
          ) {
            console.log('[getAuthUser] User not found in DB, creating new user...');
            userDetailsResponse = await createNewUserInDatabase(
              user,
              idToken,
              userRole,
              fetchWithBQ
            );
          } else if (userDetailsResponse.error) {
            // Handle other errors
            console.error('[getAuthUser] Error fetching user:', userDetailsResponse.error);
            const errorMsg = (userDetailsResponse.error as any)?.data?.message || 
                            (userDetailsResponse.error as any)?.error || 
                            'Failed to fetch user';
            return { error: errorMsg };
          }

          console.log('[getAuthUser] User retrieved successfully:', userDetailsResponse.data);
          return {
            data: {
              cognitoInfo: { ...user },
              userInfo: userDetailsResponse.data as Tenant | Manager,
              userRole,
            },
          };
        } catch (error: any) {
          console.error('[getAuthUser] Exception:', error);
          return { error: error.message || 'Could not fetch user data' };
        }
      },
    }),

    // property related endpoints
    getProperties: build.query<
      PropertyWithRelations[],
      Partial<FiltersState> & { favoriteIds?: number[] }
    >({
      query: (filters) => {
        // Ensure amenities is an array before joining
        const amenitiesArray = Array.isArray(filters.amenities) ? filters.amenities : [];
        const params = cleanParams({
          location: filters.location,
          priceMin: filters.priceRange?.[0],
          priceMax: filters.priceRange?.[1],
          beds: filters.beds,
          baths: filters.baths,
          propertyType: filters.propertyType,
          squareFeetMin: filters.squareFeet?.[0],
          squareFeetMax: filters.squareFeet?.[1],
          amenities: amenitiesArray.length > 0 ? amenitiesArray.join(',') : undefined,
          availableFrom: filters.availableFrom,
          favoriteIds: filters.favoriteIds?.join(','),
          latitude: filters.coordinates?.[1],
          longitude: filters.coordinates?.[0],
        });

        return { url: 'properties', params };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Properties' as const, id })),
              { type: 'Properties', id: 'LIST' },
            ]
          : [{ type: 'Properties', id: 'LIST' }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to fetch properties.',
        });
      },
    }),

    getProperty: build.query<PropertyWithRelations, number>({
      query: (id) => `properties/${id}`,
      providesTags: (result, error, id) => [{ type: 'PropertyDetails', id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to load property details.',
        });
      },
    }),

    // tenant related endpoints
    getTenant: build.query<TenantWithRelations, string>({
      query: (cognitoId) => `tenants/${cognitoId}`,
      providesTags: (result) => [{ type: 'Tenants', id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to load tenant profile.',
        });
      },
    }),

    getCurrentResidences: build.query<PropertyWithRelations[], string>({
      query: (cognitoId) => `tenants/${cognitoId}/current-residences`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Properties' as const, id })),
              { type: 'Properties', id: 'LIST' },
            ]
          : [{ type: 'Properties', id: 'LIST' }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to fetch current residences.',
        });
      },
    }),

    updateTenantSettings: build.mutation<
      TenantWithRelations,
      { cognitoId: string } & Partial<Tenant>
    >({
      query: ({ cognitoId, ...updatedTenant }) => ({
        url: `tenants/${cognitoId}`,
        method: 'PUT',
        body: updatedTenant,
      }),
      invalidatesTags: (result) => [{ type: 'Tenants', id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Settings updated successfully!',
          error: 'Failed to update settings.',
        });
      },
    }),

    addFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: 'POST',
      }),
      invalidatesTags: (result) => [
        { type: 'Tenants', id: result?.id },
        { type: 'Properties', id: 'LIST' },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Added to favorites!!',
          error: 'Failed to add to favorites',
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result) => [
        { type: 'Tenants', id: result?.id },
        { type: 'Properties', id: 'LIST' },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Removed from favorites!',
          error: 'Failed to remove from favorites.',
        });
      },
    }),

    // manager related endpoints
    getManagerProperties: build.query<PropertyWithRelations[], string>({
      query: (cognitoId) => `managers/${cognitoId}/properties`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Properties' as const, id })),
              { type: 'Properties', id: 'LIST' },
            ]
          : [{ type: 'Properties', id: 'LIST' }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to load manager profile.',
        });
      },
    }),

    updateManagerSettings: build.mutation<
      Manager,
      { cognitoId: string } & Partial<Manager>
    >({
      query: ({ cognitoId, ...updatedManager }) => ({
        url: `managers/${cognitoId}`,
        method: 'PUT',
        body: updatedManager,
      }),
      invalidatesTags: (result) => [{ type: 'Managers', id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Settings updated successfully!',
          error: 'Failed to update settings.',
        });
      },
    }),

    createProperty: build.mutation<PropertyWithRelations, FormData>({
      query: (newProperty) => ({
        url: `properties`,
        method: 'POST',
        body: newProperty,
      }),
      invalidatesTags: (result) => [
        { type: 'Properties', id: 'LIST' },
        { type: 'Managers', id: result?.manager?.id },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Property created successfully!',
          error: 'Failed to create property.',
        });
      },
    }),

    // lease related enpoints
    getLeases: build.query<LeaseWithRelations[], number>({
      query: () => 'leases',
      providesTags: ['Leases'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to fetch leases.',
        });
      },
    }),

    getPropertyLeases: build.query<LeaseWithRelations[], number>({
      query: (propertyId) => `properties/${propertyId}/leases`,
      providesTags: ['Leases'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to fetch property leases.',
        });
      },
    }),

    getPayments: build.query<PaymentWithRelations[], number>({
      query: (leaseId) => `leases/${leaseId}/payments`,
      providesTags: ['Payments'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to fetch payment info.',
        });
      },
    }),

    // application related endpoints
    getApplications: build.query<
      ApplicationWithRelations[],
      { userId?: string; userType?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.userId) {
          queryParams.append('userId', params.userId.toString());
        }
        if (params.userType) {
          queryParams.append('userType', params.userType);
        }

        return `applications?${queryParams.toString()}`;
      },
      providesTags: ['Applications'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to fetch applications.',
        });
      },
    }),

    updateApplicationStatus: build.mutation<
      ApplicationWithRelations & { lease?: LeaseWithRelations },
      { id: number; status: string }
    >({
      query: ({ id, status }) => ({
        url: `applications/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Applications', 'Leases'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Application status updated successfully!',
          error: 'Failed to update application settings.',
        });
      },
    }),

    createApplication: build.mutation<ApplicationWithRelations, Partial<ApplicationWithRelations>>({
      query: (body) => ({
        url: `applications`,
        method: 'POST',
        body: body,
      }),
      invalidatesTags: ['Applications'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Application created successfully!',
          error: 'Failed to create applications.',
        });
      },
    }),

    // Get initial payment details for approved application
    getInitialPaymentDetails: build.query<{
      applicationId: number;
      propertyId: number;
      propertyName: string;
      breakdown: {
        securityDeposit: number;
        firstMonthRent: number;
        applicationFee: number;
        total: number;
      };
      isPaid: boolean;
      paymentId: number | null;
    }, number>({
      query: (applicationId) => `applications/${applicationId}/initial-payment`,
      providesTags: ['Applications'],
    }),

    // Create initial payment intent
    createInitialPaymentIntent: build.mutation<{
      clientSecret: string;
      paymentIntentId: string;
      breakdown: {
        securityDeposit: number;
        firstMonthRent: number;
        applicationFee: number;
        total: number;
      };
    }, { applicationId: number }>({
      query: (body) => ({
        url: 'payments/create-initial-intent',
        method: 'POST',
        body,
      }),
    }),

    // Complete initial payment and create lease
    completeInitialPayment: build.mutation<{
      message: string;
      application: ApplicationWithRelations;
      lease: LeaseWithRelations;
      payment: Payment;
    }, { applicationId: number; stripePaymentId?: string; startDate?: string }>({
      query: ({ applicationId, ...body }) => ({
        url: `applications/${applicationId}/complete-payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Applications', 'Leases', 'Payments'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Payment completed! Your lease has been created.',
          error: 'Failed to complete payment.',
        });
      },
    }),

    // Property management endpoints
    updateProperty: build.mutation<PropertyWithRelations, { id: number; data: FormData }>({
      query: ({ id, data }) => ({
        url: `properties/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Properties', id },
        { type: 'PropertyDetails', id },
        { type: 'Properties', id: 'LIST' },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Property updated successfully!',
          error: 'Failed to update property.',
        });
      },
    }),

    deleteProperty: build.mutation<void, number>({
      query: (id) => ({
        url: `properties/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Properties'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Property deleted successfully!',
          error: 'Failed to delete property.',
        });
      },
    }),

    // Review endpoints
    getPropertyReviews: build.query<Review[], number>({
      query: (propertyId) => `reviews/property/${propertyId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Reviews' as const, id })),
              { type: 'Reviews', id: 'LIST' },
            ]
          : [{ type: 'Reviews', id: 'LIST' }],
    }),

    createReview: build.mutation<Review, { rating: number; comment?: string; propertyId: number; tenantCognitoId: string }>({
      query: (body) => ({
        url: 'reviews',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Reviews', 'PropertyDetails'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Review submitted successfully!',
          error: 'Failed to submit review.',
        });
      },
    }),

    updateReview: build.mutation<Review, { id: number; rating?: number; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `reviews/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => [{ type: 'Reviews', id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Review updated!',
          error: 'Failed to update review.',
        });
      },
    }),

    deleteReview: build.mutation<void, number>({
      query: (id) => ({
        url: `reviews/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reviews', 'PropertyDetails'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Review deleted!',
          error: 'Failed to delete review.',
        });
      },
    }),

    // Maintenance request endpoints
    getTenantMaintenanceRequests: build.query<MaintenanceRequest[], string>({
      query: (cognitoId) => `maintenance/tenant/${cognitoId}`,
      providesTags: ['Maintenance'],
    }),

    getPropertyMaintenanceRequests: build.query<MaintenanceRequest[], number>({
      query: (propertyId) => `maintenance/property/${propertyId}`,
      providesTags: ['Maintenance'],
    }),

    getManagerMaintenanceRequests: build.query<MaintenanceRequest[], string>({
      query: (cognitoId) => `maintenance/manager/${cognitoId}`,
      providesTags: ['Maintenance'],
    }),

    createMaintenanceRequest: build.mutation<MaintenanceRequest, { title: string; description: string; priority?: string; propertyId: number; tenantCognitoId: string; attachments?: string[] }>({
      query: (body) => ({
        url: 'maintenance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Maintenance'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Maintenance request submitted!',
          error: 'Failed to submit request.',
        });
      },
    }),

    updateMaintenanceRequest: build.mutation<MaintenanceRequest, { id: number; status?: string; resolution?: string }>({
      query: ({ id, ...body }) => ({
        url: `maintenance/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Maintenance'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Maintenance request updated!',
          error: 'Failed to update request.',
        });
      },
    }),

    // Notification endpoints
    getNotifications: build.query<Notification[], { cognitoId: string; userType: string }>({
      query: ({ cognitoId, userType }) => `notifications/${cognitoId}?userType=${userType}`,
      providesTags: ['Notifications'],
    }),

    markNotificationRead: build.mutation<Notification, number>({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    markAllNotificationsRead: build.mutation<void, { cognitoId: string; userType: string }>({
      query: ({ cognitoId, userType }) => ({
        url: `notifications/${cognitoId}/read-all?userType=${userType}`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    deleteNotification: build.mutation<void, number>({
      query: (id) => ({
        url: `notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Message endpoints
    getConversations: build.query<Conversation[], string>({
      query: (cognitoId) => `messages/conversations/${cognitoId}`,
      providesTags: ['Messages'],
    }),

    getMessages: build.query<Message[], { cognitoId: string; partnerId: string }>({
      query: ({ cognitoId, partnerId }) => `messages/${cognitoId}/${partnerId}`,
      providesTags: ['Messages'],
    }),

    sendMessage: build.mutation<Message, { content: string; propertyId?: number; receiverCognitoId: string; receiverType: string }>({
      query: (body) => ({
        url: 'messages',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Messages'],
    }),

    // Payment endpoints
    createPaymentIntent: build.mutation<{ clientSecret: string; paymentIntentId: string }, { leaseId: number; amount: number; paymentType?: string }>({
      query: (body) => ({
        url: 'payments/create-intent',
        method: 'POST',
        body,
      }),
    }),

    getTenantPayments: build.query<Payment[], string>({
      query: (cognitoId) => `payments/tenant/${cognitoId}`,
      providesTags: ['Payments'],
    }),

    getManagerPayments: build.query<Payment[], { cognitoId: string; status?: string; propertyId?: number }>({
      query: ({ cognitoId, status, propertyId }) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (propertyId) params.append('propertyId', String(propertyId));
        return `payments/manager/${cognitoId}?${params.toString()}`;
      },
      providesTags: ['Payments'],
    }),

    createManualPayment: build.mutation<Payment, { leaseId: number; amountPaid: number; paymentDate: string; notes?: string }>({
      query: (body) => ({
        url: 'payments/manual',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments'],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: 'Payment recorded successfully!',
          error: 'Failed to record payment.',
        });
      },
    }),

    createBillingPortalSession: build.mutation<{ url: string }, { returnUrl?: string }>({
      query: (body) => ({
        url: 'payments/billing-portal',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: 'Failed to open payment portal.',
        });
      },
    }),
  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
  useUpdateManagerSettingsMutation,
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetCurrentResidencesQuery,
  useGetManagerPropertiesQuery,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useDeletePropertyMutation,
  useGetTenantQuery,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useGetLeasesQuery,
  useGetPropertyLeasesQuery,
  useGetPaymentsQuery,
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useCreateApplicationMutation,
  useGetInitialPaymentDetailsQuery,
  useCreateInitialPaymentIntentMutation,
  useCompleteInitialPaymentMutation,
  // Review hooks
  useGetPropertyReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  // Maintenance hooks
  useGetTenantMaintenanceRequestsQuery,
  useGetPropertyMaintenanceRequestsQuery,
  useGetManagerMaintenanceRequestsQuery,
  useCreateMaintenanceRequestMutation,
  useUpdateMaintenanceRequestMutation,
  // Notification hooks
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  // Message hooks
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  // Payment hooks
  useCreatePaymentIntentMutation,
  useGetTenantPaymentsQuery,
  useGetManagerPaymentsQuery,
  useCreateManualPaymentMutation,
  useCreateBillingPortalSessionMutation,
} = api;
