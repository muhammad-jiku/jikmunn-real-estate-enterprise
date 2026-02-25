import express from 'express';
import { auth } from '../../../middleware/auth';
import { NotificationControllers } from './notification.controllers';

const router = express.Router();

// Get notifications for a user
router.get('/:cognitoId', auth(['tenant', 'manager']), NotificationControllers.getNotifications);

// Get unread count
router.get('/:cognitoId/unread-count', auth(['tenant', 'manager']), NotificationControllers.getUnreadCount);

// Mark notification as read
router.put('/:id/read', auth(['tenant', 'manager']), NotificationControllers.markAsRead);

// Mark all as read
router.put('/:cognitoId/read-all', auth(['tenant', 'manager']), NotificationControllers.markAllAsRead);

// Delete notification
router.delete('/:id', auth(['tenant', 'manager']), NotificationControllers.deleteNotification);

export const NotificationRoutes = router;
