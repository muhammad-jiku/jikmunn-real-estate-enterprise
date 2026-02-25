import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { toNotificationDTO } from '../../../../lib/dto';
import { sendSuccess } from '../../../../lib/response';
import { asyncHandler, ForbiddenError, NotFoundError } from '../../../middleware/errorHandler';

const prisma = new PrismaClient();

// Get notifications for a user
const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  const { unreadOnly } = req.query;
  const userRole = req.user?.role;

  const whereConditions: Record<string, unknown> = {};
  
  if (userRole === 'tenant') {
    whereConditions.tenantCognitoId = cognitoId;
  } else {
    whereConditions.managerCognitoId = cognitoId;
  }

  if (unreadOnly === 'true') {
    whereConditions.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where: whereConditions,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Transform to DTOs
  const notificationsDTO = notifications.map(toNotificationDTO);

  sendSuccess(res, notificationsDTO, 'Notifications retrieved successfully');
});

// Get unread count
const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  const userRole = req.user?.role;

  const whereConditions: Record<string, unknown> = {
    isRead: false,
  };
  
  if (userRole === 'tenant') {
    whereConditions.tenantCognitoId = cognitoId;
  } else {
    whereConditions.managerCognitoId = cognitoId;
  }

  const count = await prisma.notification.count({
    where: whereConditions,
  });

  sendSuccess(res, { count }, 'Unread count retrieved successfully');
});

// Mark notification as read
const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  const notification = await prisma.notification.findUnique({
    where: { id: Number(id) },
  });

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  // Verify ownership
  const isOwner = userRole === 'tenant' 
    ? notification.tenantCognitoId === userId
    : notification.managerCognitoId === userId;

  if (!isOwner) {
    throw new ForbiddenError('Not authorized to modify this notification');
  }

  const updated = await prisma.notification.update({
    where: { id: Number(id) },
    data: { isRead: true },
  });

  sendSuccess(res, toNotificationDTO(updated), 'Notification marked as read');
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  const userRole = req.user?.role;

  const whereConditions: Record<string, unknown> = {
    isRead: false,
  };
  
  if (userRole === 'tenant') {
    whereConditions.tenantCognitoId = cognitoId;
  } else {
    whereConditions.managerCognitoId = cognitoId;
  }

  await prisma.notification.updateMany({
    where: whereConditions,
    data: { isRead: true },
  });

  sendSuccess(res, { message: 'All notifications marked as read' }, 'All notifications marked as read');
});

// Delete a notification
const deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  const notification = await prisma.notification.findUnique({
    where: { id: Number(id) },
  });

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  // Verify ownership
  const isOwner = userRole === 'tenant' 
    ? notification.tenantCognitoId === userId
    : notification.managerCognitoId === userId;

  if (!isOwner) {
    throw new ForbiddenError('Not authorized to delete this notification');
  }

  await prisma.notification.delete({
    where: { id: Number(id) },
  });

  res.status(204).send();
});

export const NotificationControllers = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
