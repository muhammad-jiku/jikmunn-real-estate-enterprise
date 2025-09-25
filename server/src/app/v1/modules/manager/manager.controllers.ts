import { PrismaClient } from '@prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

const getManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId } = req.params;

    const manager = await prisma.manager.findUnique({
      where: { cognitoId },
    });

    if (manager) {
      res.status(200).json(manager);
    } else {
      res.status(404).json({ message: 'Manager not found' });
    }
  } catch (error: any) {
    console.log('error getting manager', error);
    res
      .status(500)
      .json({ message: `Error retrieving manager: ${error.message}` });
  }
};

const createManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    const manager = await prisma.manager.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(manager);
  } catch (error: any) {
    console.log('error creating manager:', error);
    res
      .status(500)
      .json({ message: `Error creating manager: ${error.message}` });
  }
};

const updateManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const updateManager = await prisma.manager.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.status(200).json(updateManager);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error updating manager: ${error.message}` });
  }
};

const getManagerProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;

    const properties = await prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: {
        location: true,
      },
    });

    const propertiesWithFormattedLocation = await Promise.all(
      properties.map(async (property) => {
        const coordinates: { coordinates: string }[] =
          await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

        const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || '');
        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];

        return {
          ...property,
          location: {
            ...property.location,
            coordinates: {
              longitude,
              latitude,
            },
          },
        };
      })
    );

    res.status(200).json(propertiesWithFormattedLocation);
  } catch (err: any) {
    console.log('error retrieving manager properties:', err);
    res
      .status(500)
      .json({ message: `Error retrieving manager properties: ${err.message}` });
  }
};

export const ManagerControllers = {
  getManager,
  createManager,
  updateManager,
  getManagerProperties,
};
