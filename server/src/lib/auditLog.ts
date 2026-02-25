import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

interface AuditLogEntry {
  action: string;
  entity: string;
  entityId?: number;
  userId: string;
  userRole: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  req?: Request;
}

export const createAuditLog = async ({
  action,
  entity,
  entityId,
  userId,
  userRole,
  oldData,
  newData,
  req,
}: AuditLogEntry): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        userRole,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
        ipAddress: req?.ip || req?.headers['x-forwarded-for']?.toString() || null,
        userAgent: req?.headers['user-agent'] || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logs shouldn't break the main flow
  }
};

export const AuditActions = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VIEW: 'VIEW',
  APPROVE: 'APPROVE',
  DENY: 'DENY',
  PAYMENT: 'PAYMENT',
} as const;

export const AuditEntities = {
  PROPERTY: 'Property',
  APPLICATION: 'Application',
  LEASE: 'Lease',
  PAYMENT: 'Payment',
  REVIEW: 'Review',
  MAINTENANCE: 'MaintenanceRequest',
  MESSAGE: 'Message',
  TENANT: 'Tenant',
  MANAGER: 'Manager',
} as const;
