/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { toPrivateUserDTO, toPropertyListDTO } from '../../../../lib/dto';
import { notifyProfileUpdated } from '../../../../lib/notifications';
import {
  sendBadRequest,
  sendConflict,
  sendError,
  sendNotFound,
  sendSuccess,
} from '../../../../lib/response';

const prisma = new PrismaClient();

const getManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;

    const manager = await prisma.manager.findUnique({
      where: { cognitoId },
    });

    if (manager) {
      sendSuccess(res, toPrivateUserDTO(manager), 'Manager retrieved successfully');
    } else {
      sendNotFound(res, 'Manager');
    }
  } catch (error: any) {
    console.error('Error getting manager:', error);
    sendError(res, 'Error retrieving manager', 500, error);
  }
};

const createManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    // Validate required fields
    if (!cognitoId || !name || !email) {
      sendBadRequest(res, 'Missing required fields: cognitoId, name, and email are required');
      return;
    }

    const manager = await prisma.manager.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber: phoneNumber || '',
      },
    });

    sendSuccess(res, toPrivateUserDTO(manager), 'Manager created successfully', 201);
  } catch (error: any) {
    console.error('Error creating manager:', error);

    // Handle unique constraint violation (user already exists)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      sendConflict(res, 'Manager already exists');
      return;
    }

    sendError(res, 'Error creating manager', 500, error);
  }
};

const updateManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;
    const { name, email, phoneNumber } = req.body;

    // Track which fields are being updated
    const currentManager = await prisma.manager.findUnique({
      where: { cognitoId },
    });

    const changedFields: string[] = [];
    if (name && name !== currentManager?.name) changedFields.push('name');
    if (email && email !== currentManager?.email) changedFields.push('email');
    if (phoneNumber && phoneNumber !== currentManager?.phoneNumber)
      changedFields.push('phone number');

    const updateManager = await prisma.manager.update({
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
        await notifyProfileUpdated(cognitoId, 'manager', changedFields);
      } catch (notifyError) {
        console.info('Error sending profile update notification:', notifyError);
      }
    }

    sendSuccess(res, toPrivateUserDTO(updateManager), 'Manager updated successfully');
  } catch (error: any) {
    console.error('Error updating manager:', error);
    sendError(res, 'Error updating manager', 500, error);
  }
};

const getManagerProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;

    const properties = await prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: {
        location: true,
      },
    });

    // Transform to DTOs

    const propertiesDTO = properties.map((property) => toPropertyListDTO(property as any));

    sendSuccess(res, propertiesDTO, 'Manager properties retrieved successfully');
  } catch (err: any) {
    console.error('Error retrieving manager properties:', err);
    sendError(res, 'Error retrieving manager properties', 500, err);
  }
};

export const ManagerControllers = {
  getManager,
  createManager,
  updateManager,
  getManagerProperties,
};
