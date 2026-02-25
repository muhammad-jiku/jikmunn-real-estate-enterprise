import { NotificationType, PrismaClient } from '@prisma/client';
import { triggerNewNotification } from '../config/pusher';

const prisma = new PrismaClient();

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  tenantCognitoId?: string;
  managerCognitoId?: string;
  data?: Record<string, unknown>;
}

export const createNotification = async ({
  type,
  title,
  message,
  tenantCognitoId,
  managerCognitoId,
  data,
}: CreateNotificationParams) => {
  const notification = await prisma.notification.create({
    data: {
      type,
      title,
      message,
      tenantCognitoId,
      managerCognitoId,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    },
  });

  // Trigger real-time notification via Pusher
  const userId = tenantCognitoId || managerCognitoId;
  if (userId) {
    await triggerNewNotification(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: data,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return notification;
};

export const notifyApplicationStatusChange = async (
  tenantCognitoId: string,
  propertyName: string,
  status: string,
  applicationId: number
) => {
  const title = `Application ${status}`;
  const message = `Your application for "${propertyName}" has been ${status.toLowerCase()}.`;
  
  return createNotification({
    type: NotificationType.ApplicationStatus,
    title,
    message,
    tenantCognitoId,
    data: { applicationId, propertyName, status },
  });
};

export const notifyPaymentDue = async (
  tenantCognitoId: string,
  propertyName: string,
  amount: number,
  dueDate: Date,
  leaseId: number
) => {
  const title = 'Payment Due';
  const message = `Your rent payment of $${amount} for "${propertyName}" is due on ${dueDate.toLocaleDateString()}.`;
  
  return createNotification({
    type: NotificationType.PaymentDue,
    title,
    message,
    tenantCognitoId,
    data: { leaseId, propertyName, amount, dueDate: dueDate.toISOString() },
  });
};

export const notifyPaymentReceived = async (
  managerCognitoId: string,
  tenantName: string,
  propertyName: string,
  amount: number,
  paymentId: number
) => {
  const title = 'Payment Received';
  const message = `${tenantName} has made a payment of $${amount} for "${propertyName}".`;
  
  return createNotification({
    type: NotificationType.PaymentReceived,
    title,
    message,
    managerCognitoId,
    data: { paymentId, tenantName, propertyName, amount },
  });
};

export const notifyLeaseExpiring = async (
  tenantCognitoId: string,
  managerCognitoId: string,
  propertyName: string,
  endDate: Date,
  leaseId: number
) => {
  const title = 'Lease Expiring Soon';
  const message = `The lease for "${propertyName}" expires on ${endDate.toLocaleDateString()}.`;
  
  // Notify both tenant and manager
  await createNotification({
    type: NotificationType.LeaseExpiring,
    title,
    message,
    tenantCognitoId,
    data: { leaseId, propertyName, endDate: endDate.toISOString() },
  });
  
  await createNotification({
    type: NotificationType.LeaseExpiring,
    title,
    message,
    managerCognitoId,
    data: { leaseId, propertyName, endDate: endDate.toISOString() },
  });
};

export const notifyMaintenanceUpdate = async (
  tenantCognitoId: string,
  title: string,
  status: string,
  maintenanceId: number
) => {
  const notificationTitle = 'Maintenance Update';
  const message = `Your maintenance request "${title}" has been updated to: ${status}.`;
  
  return createNotification({
    type: NotificationType.MaintenanceUpdate,
    title: notificationTitle,
    message,
    tenantCognitoId,
    data: { maintenanceId, requestTitle: title, status },
  });
};

export const notifyNewMessage = async (
  recipientCognitoId: string,
  recipientType: 'tenant' | 'manager',
  senderName: string,
  messagePreview: string,
  messageId: number
) => {
  const title = 'New Message';
  const message = `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`;
  
  const params: CreateNotificationParams = {
    type: NotificationType.NewMessage,
    title,
    message,
    data: { messageId, senderName },
  };
  
  if (recipientType === 'tenant') {
    params.tenantCognitoId = recipientCognitoId;
  } else {
    params.managerCognitoId = recipientCognitoId;
  }
  
  return createNotification(params);
};

export const notifyNewReview = async (
  managerCognitoId: string,
  propertyName: string,
  rating: number,
  reviewId: number
) => {
  const title = 'New Review';
  const message = `A new ${rating}-star review has been posted for "${propertyName}".`;
  
  return createNotification({
    type: NotificationType.NewReview,
    title,
    message,
    managerCognitoId,
    data: { reviewId, propertyName, rating },
  });
};

export const notifyNewApplication = async (
  managerCognitoId: string,
  tenantName: string,
  propertyName: string,
  applicationId: number
) => {
  const title = 'New Application';
  const message = `${tenantName} has submitted an application for "${propertyName}".`;
  
  return createNotification({
    type: NotificationType.NewApplication,
    title,
    message,
    managerCognitoId,
    data: { applicationId, tenantName, propertyName },
  });
};

export const notifyNewMaintenanceRequest = async (
  managerCognitoId: string,
  tenantName: string,
  propertyName: string,
  requestTitle: string,
  maintenanceId: number
) => {
  const title = 'New Maintenance Request';
  const message = `${tenantName} has submitted a maintenance request "${requestTitle}" for "${propertyName}".`;
  
  return createNotification({
    type: NotificationType.NewMaintenanceRequest,
    title,
    message,
    managerCognitoId,
    data: { maintenanceId, tenantName, propertyName, requestTitle },
  });
};

// Property CRUD notifications
export const notifyPropertyCreated = async (
  tenantCognitoIds: string[],
  managerName: string,
  propertyName: string,
  propertyId: number
) => {
  const title = 'New Property Available';
  const message = `${managerName} has listed a new property: "${propertyName}".`;
  
  // Notify all tenants who have favorited properties from this manager
  for (const tenantCognitoId of tenantCognitoIds) {
    await createNotification({
      type: NotificationType.PropertyUpdate,
      title,
      message,
      tenantCognitoId,
      data: { propertyId, propertyName, managerName, action: 'created' },
    });
  }
};

export const notifyPropertyUpdated = async (
  tenantCognitoIds: string[],
  propertyName: string,
  propertyId: number,
  changes?: string[]
) => {
  const title = 'Property Updated';
  const changeText = changes && changes.length > 0 
    ? ` Changes: ${changes.join(', ')}.` 
    : '';
  const message = `The property "${propertyName}" has been updated.${changeText}`;
  
  // Notify all tenants currently living at this property
  for (const tenantCognitoId of tenantCognitoIds) {
    await createNotification({
      type: NotificationType.PropertyUpdate,
      title,
      message,
      tenantCognitoId,
      data: { propertyId, propertyName, action: 'updated', changes },
    });
  }
};

export const notifyPropertyDeleted = async (
  tenantCognitoIds: string[],
  propertyName: string,
  propertyId: number
) => {
  const title = 'Property Removed';
  const message = `The property "${propertyName}" has been removed from listings.`;
  
  // Notify all tenants who had favorited this property
  for (const tenantCognitoId of tenantCognitoIds) {
    await createNotification({
      type: NotificationType.PropertyUpdate,
      title,
      message,
      tenantCognitoId,
      data: { propertyId, propertyName, action: 'deleted' },
    });
  }
};

// Tenant/Manager profile notifications
export const notifyProfileUpdated = async (
  recipientCognitoId: string,
  recipientType: 'tenant' | 'manager',
  fields: string[]
) => {
  const title = 'Profile Updated';
  const message = `Your profile has been updated. Changed fields: ${fields.join(', ')}.`;
  
  const params: CreateNotificationParams = {
    type: NotificationType.ProfileUpdate,
    title,
    message,
    data: { fields, action: 'profile_updated' },
  };
  
  if (recipientType === 'tenant') {
    params.tenantCognitoId = recipientCognitoId;
  } else {
    params.managerCognitoId = recipientCognitoId;
  }
  
  return createNotification(params);
};
