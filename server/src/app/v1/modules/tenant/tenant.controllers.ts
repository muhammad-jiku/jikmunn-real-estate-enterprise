import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import {
  PrivateUserDTO,
  PropertyDetailDTO,
  toPrivateUserDTO,
  toPropertyDetailDTO,
} from '../../../../lib/dto';
import { notifyProfileUpdated } from '../../../../lib/notifications';
import {
  sendBadRequest,
  sendConflict,
  sendError,
  sendNotFound,
  sendSuccess,
} from '../../../../lib/response';

const prisma = new PrismaClient();

// ============================================================================
// TENANT DTOs (specific to tenant controller)
// ============================================================================

interface TenantWithFavoritesDTO extends PrivateUserDTO {
  favoritePropertyIds: number[];
}

function toTenantWithFavoritesDTO(tenant: {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  favorites?: { id: number }[];
}): TenantWithFavoritesDTO {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...toPrivateUserDTO(tenant as any),
    favoritePropertyIds: tenant.favorites?.map((f) => f.id) || [],
  };
}

const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;

    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: {
        favorites: {
          select: { id: true }, // Only fetch IDs, not full property data
        },
      },
    });

    if (tenant) {
      // Transform to DTO - strips cognitoId and only returns safe fields
      sendSuccess(res, toTenantWithFavoritesDTO(tenant), 'Tenant retrieved successfully');
    } else {
      sendNotFound(res, 'Tenant');
    }
  } catch (error: unknown) {
    console.error('Error retrieving tenant:', error);
    sendError(res, 'Error retrieving tenant', 500, error instanceof Error ? error : String(error));
  }
};

const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    // Validate required fields
    if (!cognitoId || !name || !email) {
      sendBadRequest(res, 'Missing required fields: cognitoId, name, and email are required');
      return;
    }

    const tenant = await prisma.tenant.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber: phoneNumber || '',
      },
    });

    // Return DTO without sensitive fields like cognitoId
    sendSuccess(res, toPrivateUserDTO(tenant), 'Tenant created successfully', 201);
  } catch (error: unknown) {
    console.error('Error creating tenant:', error);

    // Handle unique constraint violation (user already exists)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      sendConflict(res, 'Tenant already exists');
      return;
    }

    sendError(res, 'Error creating tenant', 500, error instanceof Error ? error : String(error));
  }
};

const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;
    const { name, email, phoneNumber } = req.body;

    // Track which fields are being updated
    const currentTenant = await prisma.tenant.findUnique({
      where: { cognitoId },
    });

    const changedFields: string[] = [];
    if (name && name !== currentTenant?.name) changedFields.push('name');
    if (email && email !== currentTenant?.email) changedFields.push('email');
    if (phoneNumber && phoneNumber !== currentTenant?.phoneNumber)
      changedFields.push('phone number');

    const updateTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    // Send notification about profile update
    if (changedFields.length > 0) {
      try {
        await notifyProfileUpdated(cognitoId, 'tenant', changedFields);
      } catch (notifyError) {
        console.info('Error sending profile update notification:', notifyError);
      }
    }

    // Return DTO without sensitive fields
    sendSuccess(res, toPrivateUserDTO(updateTenant), 'Tenant updated successfully');
  } catch (error: unknown) {
    console.error('Error updating tenant:', error);
    sendError(res, 'Error updating tenant', 500, error instanceof Error ? error : String(error));
  }
};

const getCurrentResidences = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;

    const properties = await prisma.property.findMany({
      where: { tenants: { some: { cognitoId } } },
      include: {
        location: true,
        manager: {
          select: {
            cognitoId: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Transform to DTOs - strips managerCognitoId, locationId, etc.
    const residences: PropertyDetailDTO[] = properties.map((property) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toPropertyDetailDTO(property as any)
    );

    sendSuccess(res, residences, 'Residences retrieved successfully');
  } catch (err: unknown) {
    console.error('Error retrieving tenant properties:', err);
    sendError(
      res,
      'Error retrieving tenant properties',
      500,
      err instanceof Error ? err : String(err)
    );
  }
};

const addFavoriteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;
    const propertyId = req.params.propertyId as string;

    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: { favorites: true },
    });

    if (!tenant) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }

    const propertyIdNumber = Number(propertyId);
    const existingFavorites = tenant.favorites || [];

    if (!existingFavorites.some((fav: { id: number }) => fav.id === propertyIdNumber)) {
      const updatedTenant = await prisma.tenant.update({
        where: { cognitoId },
        data: {
          favorites: {
            connect: { id: propertyIdNumber },
          },
        },
        include: {
          favorites: { select: { id: true } },
        },
      });

      sendSuccess(res, toTenantWithFavoritesDTO(updatedTenant), 'Favorite added successfully');
    } else {
      sendConflict(res, 'Property already added as favorite');
    }
  } catch (error: unknown) {
    console.error('Error adding favorite property:', error);
    sendError(
      res,
      'Error adding favorite property',
      500,
      error instanceof Error ? error : String(error)
    );
  }
};

const removeFavoriteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;
    const propertyId = req.params.propertyId as string;
    const propertyIdNumber = Number(propertyId);

    const updatedTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: {
        favorites: {
          disconnect: { id: propertyIdNumber },
        },
      },
      include: {
        favorites: { select: { id: true } },
      },
    });

    sendSuccess(res, toTenantWithFavoritesDTO(updatedTenant), 'Favorite removed successfully');
  } catch (err: unknown) {
    console.error('Error removing favorite property:', err);
    sendError(
      res,
      'Error removing favorite property',
      500,
      err instanceof Error ? err : String(err)
    );
  }
};

export const TenantControllers = {
  getTenant,
  createTenant,
  updateTenant,
  getCurrentResidences,
  addFavoriteProperty,
  removeFavoriteProperty,
};
