'use client';

import {
  api,
  Notification,
  useDeleteNotificationMutation,
  useGetAuthUserQuery,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/state/api';
import { PusherEvents, usePusher } from '@/state/pusher';
import { useAppDispatch } from '@/state/redux';
import {
  Bell,
  Check,
  CheckCheck,
  DollarSign,
  FileText,
  Home,
  MessageSquare,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const notificationIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare className="w-4 h-4" />,
  application: <FileText className="w-4 h-4" />,
  payment: <DollarSign className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  lease: <Home className="w-4 h-4" />,
  review: <Home className="w-4 h-4" />,
};

export function NotificationDropdown() {
  const { data: authUser } = useGetAuthUserQuery();
  const { channel } = usePusher();
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications, refetch } = useGetNotificationsQuery(
    {
      cognitoId: authUser?.cognitoInfo?.userId || '',
      userType: authUser?.userRole || 'tenant',
    },
    { skip: !authUser?.cognitoInfo?.userId }
  );

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  // Listen for real-time notifications via Pusher
  useEffect(() => {
    if (!channel) return;

    const handleNewNotification = () => {
      // Invalidate and refetch notifications when a new one arrives
      dispatch(api.util.invalidateTags(['Notifications']));
      refetch();
    };

    channel.bind(PusherEvents.NEW_NOTIFICATION, handleNewNotification);

    return () => {
      channel.unbind(PusherEvents.NEW_NOTIFICATION, handleNewNotification);
    };
  }, [channel, dispatch, refetch]);

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.isRead).length
    : 0;

  const handleMarkRead = async (id: number) => {
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    if (!authUser?.cognitoInfo?.userId) return;
    await markAllRead({
      cognitoId: authUser.cognitoInfo.userId,
      userType: authUser.userRole,
    });
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    const normalizedType = type.toLowerCase();
    for (const [key, icon] of Object.entries(notificationIcons)) {
      if (normalizedType.includes(key)) return icon;
    }
    return <Bell className="w-4 h-4" />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {Array.isArray(notifications) && notifications.length > 0 ? (
            notifications.slice(0, 10).map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
                onClick={() => !notification.isRead && handleMarkRead(notification.id)}
              >
                <div className="flex-shrink-0 mt-1 text-gray-500">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{getTimeAgo(notification.createdAt)}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notification.id);
                      }}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(notification.id, e)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No notifications</p>
            </div>
          )}
        </div>

        {notifications && notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-blue-600">
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
