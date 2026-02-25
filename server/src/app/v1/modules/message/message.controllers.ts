import { Prisma, PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { triggerNewMessage } from '../../../../config/pusher';
import { notifyNewMessage } from '../../../../lib/notifications';
import { sendSuccess } from '../../../../lib/response';
import { asyncHandler } from '../../../middleware/errorHandler';

const prisma = new PrismaClient();

// Message type for TypeScript
interface MessageWithRelations {
  id: number;
  content: string;
  propertyId: number | null;
  senderTenantCognitoId: string | null;
  senderManagerCognitoId: string | null;
  receiverTenantCognitoId: string | null;
  receiverManagerCognitoId: string | null;
  readAt: Date | null;
  createdAt: Date;
  property?: { id: number; name: string } | null;
  senderTenant?: { cognitoId: string; name: string } | null;
  senderManager?: { cognitoId: string; name: string } | null;
  receiverTenant?: { cognitoId: string; name: string } | null;
  receiverManager?: { cognitoId: string; name: string } | null;
}

// Get conversations for a user
const getConversations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cognitoId = req.params.cognitoId as string;
  const userRole = req.user?.role;

  // Get all messages involving this user
  const whereConditions: Prisma.MessageWhereInput =
    userRole === 'tenant'
      ? {
          OR: [{ senderTenantCognitoId: cognitoId }, { receiverTenantCognitoId: cognitoId }],
        }
      : {
          OR: [{ senderManagerCognitoId: cognitoId }, { receiverManagerCognitoId: cognitoId }],
        };

  const messages = (await prisma.message.findMany({
    where: whereConditions,
    include: {
      property: { select: { id: true, name: true } },
      senderTenant: { select: { cognitoId: true, name: true } },
      senderManager: { select: { cognitoId: true, name: true } },
      receiverTenant: { select: { cognitoId: true, name: true } },
      receiverManager: { select: { cognitoId: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })) as MessageWithRelations[];

  // Group messages by conversation partner (one conversation per partner regardless of property)
  const conversationsMap = new Map<
    string,
    {
      partnerId: string;
      partnerName: string;
      partnerType: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }
  >();

  messages.forEach((msg) => {
    let partnerId: string;
    let partnerName: string;
    let partnerType: string;

    if (userRole === 'tenant') {
      if (msg.senderTenantCognitoId === cognitoId) {
        partnerId = msg.receiverManagerCognitoId || msg.receiverTenantCognitoId || '';
        partnerName = msg.receiverManager?.name || msg.receiverTenant?.name || '';
        partnerType = msg.receiverManagerCognitoId ? 'manager' : 'tenant';
      } else {
        partnerId = msg.senderManagerCognitoId || msg.senderTenantCognitoId || '';
        partnerName = msg.senderManager?.name || msg.senderTenant?.name || '';
        partnerType = msg.senderManagerCognitoId ? 'manager' : 'tenant';
      }
    } else {
      if (msg.senderManagerCognitoId === cognitoId) {
        partnerId = msg.receiverTenantCognitoId || msg.receiverManagerCognitoId || '';
        partnerName = msg.receiverTenant?.name || msg.receiverManager?.name || '';
        partnerType = msg.receiverTenantCognitoId ? 'tenant' : 'manager';
      } else {
        partnerId = msg.senderTenantCognitoId || msg.senderManagerCognitoId || '';
        partnerName = msg.senderTenant?.name || msg.senderManager?.name || '';
        partnerType = msg.senderTenantCognitoId ? 'tenant' : 'manager';
      }
    }

    // Use partnerId as key - one conversation per partner
    const key = partnerId;

    if (!conversationsMap.has(key)) {
      const isUnread =
        !msg.readAt &&
        ((userRole === 'tenant' && msg.receiverTenantCognitoId === cognitoId) ||
          (userRole === 'manager' && msg.receiverManagerCognitoId === cognitoId));

      conversationsMap.set(key, {
        partnerId,
        partnerName,
        partnerType,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt.toISOString(),
        unreadCount: isUnread ? 1 : 0,
      });
    } else {
      const existing = conversationsMap.get(key);
      if (!existing) return;
      const isUnread =
        !msg.readAt &&
        ((userRole === 'tenant' && msg.receiverTenantCognitoId === cognitoId) ||
          (userRole === 'manager' && msg.receiverManagerCognitoId === cognitoId));
      if (isUnread) {
        existing.unreadCount++;
      }
    }
  });

  // Response DTO - removes cognitoId from response
  const conversationsDTO = Array.from(conversationsMap.values()).map((conv) => ({
    partnerName: conv.partnerName,
    partnerType: conv.partnerType,
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: conv.unreadCount,
  }));

  sendSuccess(res, conversationsDTO, 'Conversations retrieved successfully');
});

// Get messages with a specific user
const getMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { cognitoId, partnerId } = req.params;
  const { propertyId } = req.query;
  const userRole = req.user?.role;

  const whereConditions: Record<string, unknown>[] = [];

  if (userRole === 'tenant') {
    whereConditions.push(
      {
        senderTenantCognitoId: cognitoId,
        OR: [{ receiverManagerCognitoId: partnerId }, { receiverTenantCognitoId: partnerId }],
      },
      {
        receiverTenantCognitoId: cognitoId,
        OR: [{ senderManagerCognitoId: partnerId }, { senderTenantCognitoId: partnerId }],
      }
    );
  } else {
    whereConditions.push(
      {
        senderManagerCognitoId: cognitoId,
        OR: [{ receiverTenantCognitoId: partnerId }, { receiverManagerCognitoId: partnerId }],
      },
      {
        receiverManagerCognitoId: cognitoId,
        OR: [{ senderTenantCognitoId: partnerId }, { senderManagerCognitoId: partnerId }],
      }
    );
  }

  const where: Record<string, unknown> = { OR: whereConditions };
  if (propertyId) {
    where.propertyId = Number(propertyId);
  }

  const messages: MessageWithRelations[] = (await prisma.message.findMany({
    where,
    include: {
      property: { select: { id: true, name: true } },
      senderTenant: { select: { cognitoId: true, name: true } },
      senderManager: { select: { cognitoId: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })) as MessageWithRelations[];

  // Mark messages as read
  const unreadMessageIds = messages
    .filter((msg: MessageWithRelations) => {
      if (userRole === 'tenant') {
        return msg.receiverTenantCognitoId === cognitoId && !msg.readAt;
      }
      return msg.receiverManagerCognitoId === cognitoId && !msg.readAt;
    })
    .map((msg: MessageWithRelations) => msg.id);

  if (unreadMessageIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadMessageIds } },
      data: { readAt: new Date() },
    });
  }

  // Transform messages - already sanitized to not expose cognitoIds directly
  const transformedMessages = messages.map((msg: MessageWithRelations) => ({
    id: msg.id,
    content: msg.content,
    propertyId: msg.propertyId,
    senderName: msg.senderTenant?.name || msg.senderManager?.name || '',
    senderType: msg.senderTenantCognitoId ? 'tenant' : 'manager',
    createdAt: msg.createdAt.toISOString(),
    property: msg.property ? { id: msg.property.id, name: msg.property.name } : null,
  }));

  sendSuccess(res, transformedMessages, 'Messages retrieved successfully');
});

// Send a message
const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { content, propertyId, receiverCognitoId, receiverType } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Get sender info
  let senderName = '';
  if (userRole === 'tenant') {
    const tenant = await prisma.tenant.findUnique({ where: { cognitoId: userId } });
    senderName = tenant?.name || '';
  } else {
    const manager = await prisma.manager.findUnique({ where: { cognitoId: userId } });
    senderName = manager?.name || '';
  }

  const messageData: Record<string, unknown> = {
    content,
    propertyId: propertyId ? Number(propertyId) : null,
  };

  if (userRole === 'tenant') {
    messageData.senderTenantCognitoId = userId;
  } else {
    messageData.senderManagerCognitoId = userId;
  }

  if (receiverType === 'tenant') {
    messageData.receiverTenantCognitoId = receiverCognitoId;
  } else {
    messageData.receiverManagerCognitoId = receiverCognitoId;
  }

  const message = await prisma.message.create({
    data: messageData as never,
    include: {
      property: { select: { id: true, name: true } },
      senderTenant: { select: { cognitoId: true, name: true } },
      senderManager: { select: { cognitoId: true, name: true } },
    },
  });

  // Trigger real-time message via Pusher
  await triggerNewMessage(receiverCognitoId, {
    id: message.id,
    content: message.content,
    senderName,
    senderId: userId || '',
    propertyId: message.propertyId || undefined,
    createdAt: message.createdAt.toISOString(),
  });

  // Notify receiver (creates notification and also sends via Pusher)
  await notifyNewMessage(receiverCognitoId, receiverType, senderName, content, message.id);

  // Response DTO - don't expose cognitoIds
  const messageDTO = {
    id: message.id,
    content: message.content,
    propertyId: message.propertyId,
    senderName: message.senderTenant?.name || message.senderManager?.name || '',
    createdAt: message.createdAt.toISOString(),
    property: message.property ? { id: message.property.id, name: message.property.name } : null,
  };

  sendSuccess(res, messageDTO, 'Message sent successfully', 201);
});

export const MessageControllers = {
  getConversations,
  getMessages,
  sendMessage,
};
