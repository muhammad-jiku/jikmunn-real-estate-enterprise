import { MaintenanceStatus, PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { AuditActions, AuditEntities, createAuditLog } from '../../../../lib/auditLog';
import { toMaintenanceRequestDTO } from '../../../../lib/dto';
import {
  notifyMaintenanceUpdate,
  notifyNewMaintenanceRequest,
} from '../../../../lib/notifications';
import { sendSuccess } from '../../../../lib/response';
import { asyncHandler, ForbiddenError, NotFoundError } from '../../../middleware/errorHandler';

const prisma = new PrismaClient();

// Get maintenance requests for a tenant
const getTenantRequests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cognitoId = req.params.cognitoId as string;

  const requests = await prisma.maintenanceRequest.findMany({
    where: { tenantCognitoId: cognitoId },
    include: {
      property: {
        select: { id: true, name: true, photoUrls: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to DTOs
  const requestsDTO = requests.map((req) => ({
    ...toMaintenanceRequestDTO(req),
    property: { id: req.property.id, name: req.property.name, photoUrls: req.property.photoUrls },
  }));

  sendSuccess(res, requestsDTO, 'Maintenance requests retrieved successfully');
});

// Get maintenance requests for a property (manager)
const getPropertyRequests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { propertyId } = req.params;
  const userId = req.user?.id;

  // Verify manager owns this property
  const property = await prisma.property.findFirst({
    where: {
      id: Number(propertyId),
      managerCognitoId: userId,
    },
  });

  if (!property) {
    throw new ForbiddenError('You do not manage this property');
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: { propertyId: Number(propertyId) },
    include: {
      tenant: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });

  // Transform to DTOs
  const requestsDTO = requests.map((req) => ({
    ...toMaintenanceRequestDTO(req),
    tenant: {
      id: req.tenant.id,
      name: req.tenant.name,
      email: req.tenant.email,
      phoneNumber: req.tenant.phoneNumber,
    },
  }));

  sendSuccess(res, requestsDTO, 'Property maintenance requests retrieved successfully');
});

// Get all maintenance requests for a manager's properties
const getManagerRequests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  const { status, priority } = req.query;

  const whereConditions: Record<string, unknown> = {
    property: { managerCognitoId: cognitoId },
  };

  if (status && status !== 'all') {
    whereConditions.status = status as MaintenanceStatus;
  }

  if (priority && priority !== 'all') {
    whereConditions.priority = priority;
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: whereConditions,
    include: {
      property: {
        select: { id: true, name: true },
      },
      tenant: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });

  // Transform to DTOs
  const requestsDTO = requests.map((req) => ({
    ...toMaintenanceRequestDTO(req),
    property: { id: req.property.id, name: req.property.name },
    tenant: {
      id: req.tenant.id,
      name: req.tenant.name,
      email: req.tenant.email,
      phoneNumber: req.tenant.phoneNumber,
    },
  }));

  sendSuccess(res, requestsDTO, 'Manager maintenance requests retrieved successfully');
});

// Create maintenance request
const createRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { title, description, priority, propertyId, tenantCognitoId, attachments } = req.body;

  // Verify tenant lives at this property
  const lease = await prisma.lease.findFirst({
    where: {
      propertyId: Number(propertyId),
      tenantCognitoId,
      endDate: { gte: new Date() },
    },
  });

  if (!lease) {
    throw new ForbiddenError('You can only submit requests for properties you currently rent');
  }

  const request = await prisma.maintenanceRequest.create({
    data: {
      title,
      description,
      priority: priority || 'Medium',
      propertyId: Number(propertyId),
      tenantCognitoId,
      attachments: attachments || [],
    },
    include: {
      property: {
        include: {
          manager: true,
        },
      },
      tenant: true,
    },
  });

  // Notify manager of new maintenance request
  await notifyNewMaintenanceRequest(
    request.property.managerCognitoId,
    request.tenant.name,
    request.property.name,
    title,
    request.id
  );

  // Audit log
  await createAuditLog({
    action: AuditActions.CREATE,
    entity: AuditEntities.MAINTENANCE,
    entityId: request.id,
    userId: tenantCognitoId,
    userRole: 'tenant',
    newData: { title, description, priority, propertyId },
    req,
  });

  sendSuccess(
    res,
    toMaintenanceRequestDTO(request),
    'Maintenance request created successfully',
    201
  );
});

// Update maintenance request (manager only)
const updateRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, resolution } = req.body;
  const userId = req.user?.id;

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: Number(id) },
    include: {
      property: true,
    },
  });

  if (!request) {
    throw new NotFoundError('Maintenance request not found');
  }

  // Verify manager owns the property
  if (request.property.managerCognitoId !== userId) {
    throw new ForbiddenError('You do not manage this property');
  }

  const oldStatus = request.status;

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (resolution) updateData.resolution = resolution;
  if (status === 'Completed') updateData.resolvedAt = new Date();

  const updatedRequest = await prisma.maintenanceRequest.update({
    where: { id: Number(id) },
    data: updateData,
  });

  // Notify tenant if status changed
  if (status && status !== oldStatus) {
    await notifyMaintenanceUpdate(request.tenantCognitoId, request.title, status, request.id);
  }

  // Audit log
  await createAuditLog({
    action: AuditActions.UPDATE,
    entity: AuditEntities.MAINTENANCE,
    entityId: request.id,
    userId: userId || '',
    userRole: 'manager',
    oldData: { status: oldStatus },
    newData: { status, resolution },
    req,
  });

  sendSuccess(
    res,
    toMaintenanceRequestDTO(updatedRequest),
    'Maintenance request updated successfully'
  );
});

export const MaintenanceControllers = {
  getTenantRequests,
  getPropertyRequests,
  getManagerRequests,
  createRequest,
  updateRequest,
};
