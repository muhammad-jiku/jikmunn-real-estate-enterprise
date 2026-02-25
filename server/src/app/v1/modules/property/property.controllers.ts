/* eslint-disable @typescript-eslint/no-explicit-any */
import { Location, Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { Request, Response } from 'express';
import { uploadToCloudinary } from '../../../../config/cloudinary';
import { toLeaseDTO, toPaymentDTO, toPropertyDetailDTO } from '../../../../lib/dto';
import {
  notifyPropertyCreated,
  notifyPropertyDeleted,
  notifyPropertyUpdated,
} from '../../../../lib/notifications';
import {
  sendBadRequest,
  sendError,
  sendForbidden,
  sendNotFound,
  sendSuccess,
} from '../../../../lib/response';

const prisma = new PrismaClient();

// Valid amenity enum values for validation
const VALID_AMENITIES = [
  'WasherDryer',
  'AirConditioning',
  'Dishwasher',
  'HighSpeedInternet',
  'HardwoodFloors',
  'WalkInClosets',
  'Microwave',
  'Refrigerator',
  'Pool',
  'Gym',
  'Parking',
  'PetsAllowed',
  'WiFi',
];

const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      favoriteIds,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      latitude,
      longitude,
      location,
    } = req.query;

    const whereConditions: Prisma.Sql[] = [];

    if (favoriteIds) {
      const favoriteIdsArray = (favoriteIds as string).split(',').map(Number);
      whereConditions.push(Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`);
    }

    if (priceMin) {
      whereConditions.push(Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`);
    }

    if (priceMax) {
      whereConditions.push(Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`);
    }

    if (beds && beds !== 'any') {
      whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`);
    }

    if (baths && baths !== 'any') {
      whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`);
    }

    if (squareFeetMin) {
      whereConditions.push(Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`);
    }

    if (squareFeetMax) {
      whereConditions.push(Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`);
    }

    if (propertyType && propertyType !== 'any') {
      whereConditions.push(Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`);
    }

    if (amenities && amenities !== 'any') {
      const amenitiesArray = (amenities as string).split(',');
      // Filter to only valid amenity values to prevent SQL injection
      const validAmenities = amenitiesArray.filter((a) => VALID_AMENITIES.includes(a));
      if (validAmenities.length > 0) {
        // Build array literal for PostgreSQL: ARRAY['Amenity1', 'Amenity2']::"Amenity"[]
        const amenitiesLiteral = `ARRAY[${validAmenities.map((a) => `'${a}'`).join(',')}]::"Amenity"[]`;
        whereConditions.push(Prisma.sql`p.amenities @> ${Prisma.raw(amenitiesLiteral)}`);
      }
    }

    if (availableFrom && availableFrom !== 'any') {
      const availableFromDate = typeof availableFrom === 'string' ? availableFrom : null;
      if (availableFromDate) {
        const date = new Date(availableFromDate);
        if (!isNaN(date.getTime())) {
          whereConditions.push(
            Prisma.sql`EXISTS (
              SELECT 1 FROM "Lease" l 
              WHERE l."propertyId" = p.id 
              AND l."startDate" <= ${date.toISOString()}
            )`
          );
        }
      }
    }

    // Location search: combine coordinate-based and text-based search
    // Properties are matched by either coordinate proximity OR text match
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInMiles = 50;
      // Use bounding box approach for distance filtering (approx 1 degree = 69 miles)
      const degreesLat = radiusInMiles / 69;
      const degreesLng = radiusInMiles / (69 * Math.cos(lat * (Math.PI / 180)));

      // If location name is also provided, match by coordinate proximity OR text search
      if (location && typeof location === 'string' && location.trim()) {
        const locationSearch = `%${location.trim().toLowerCase()}%`;
        whereConditions.push(
          Prisma.sql`(
            (l.latitude BETWEEN ${lat - degreesLat} AND ${lat + degreesLat}
              AND l.longitude BETWEEN ${lng - degreesLng} AND ${lng + degreesLng})
            OR (
              LOWER(l.city) LIKE ${locationSearch}
              OR LOWER(l.state) LIKE ${locationSearch}
              OR LOWER(l.address) LIKE ${locationSearch}
              OR LOWER(l.country) LIKE ${locationSearch}
            )
          )`
        );
      } else {
        whereConditions.push(
          Prisma.sql`l.latitude BETWEEN ${lat - degreesLat} AND ${lat + degreesLat}
            AND l.longitude BETWEEN ${lng - degreesLng} AND ${lng + degreesLng}`
        );
      }
    } else if (location && typeof location === 'string' && location.trim()) {
      // Text-only location search when no coordinates provided
      const locationSearch = `%${location.trim().toLowerCase()}%`;
      whereConditions.push(
        Prisma.sql`(
          LOWER(l.city) LIKE ${locationSearch}
          OR LOWER(l.state) LIKE ${locationSearch}
          OR LOWER(l.address) LIKE ${locationSearch}
          OR LOWER(l.country) LIKE ${locationSearch}
        )`
      );
    }

    const completeQuery = Prisma.sql`
      SELECT 
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'longitude', l.longitude,
            'latitude', l.latitude
          )
        ) as location
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      ${
        whereConditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
          : Prisma.empty
      }
    `;

    const properties = await prisma.$queryRaw(completeQuery);

    // Sanitize properties - raw query returns all fields, need to clean up

    const propertiesDTO = (properties as any[]).map((property: any) => ({
      id: property.id,
      name: property.name,
      description: property.description,
      pricePerMonth: property.pricePerMonth,
      beds: property.beds,
      baths: property.baths,
      squareFeet: property.squareFeet,
      propertyType: property.propertyType,
      photoUrls: property.photoUrls,
      amenities: property.amenities,
      isPetsAllowed: property.isPetsAllowed,
      isParkingIncluded: property.isParkingIncluded,
      averageRating: property.averageRating,
      numberOfReviews: property.numberOfReviews,
      postedDate: property.postedDate,
      location: property.location,
    }));

    sendSuccess(res, propertiesDTO, 'Properties retrieved successfully');
  } catch (error: any) {
    console.error('Error retrieving properties:', error);
    sendError(res, 'Error retrieving properties', 500, error);
  }
};

const getProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
      include: {
        location: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (property) {
      // Transform to DTO - removes managerCognitoId, locationId, etc.

      const propertyDTO = toPropertyDetailDTO(property as any);
      sendSuccess(res, propertyDTO, 'Property retrieved successfully');
    } else {
      sendNotFound(res, 'Property');
    }
  } catch (err: any) {
    console.error('Error retrieving property:', err);
    sendError(res, 'Error retrieving property', 500, err);
  }
};

const getPropertyLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Number(id);

    if (Number.isNaN(propertyId)) {
      sendBadRequest(res, 'Invalid property id');
      return;
    }

    // Fetch leases for the property. Include tenant and payments so frontend can
    // determine current-month payment status from a single response.
    const leases = await prisma.lease.findMany({
      where: { propertyId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        payments: true,
      },
      orderBy: { startDate: 'desc' },
    });

    // Transform leases to DTOs - strips cognitoId, internal stripe IDs, etc.
    const leasesDTO = leases.map((lease) => ({
      ...toLeaseDTO(lease),
      tenant: lease.tenant,
      payments: lease.payments.map(toPaymentDTO),
    }));

    sendSuccess(res, leasesDTO, 'Property leases retrieved successfully');
  } catch (err: any) {
    console.error('Error retrieving leases for property:', err);
    sendError(res, 'Error retrieving property leases', 500, err);
  }
};

const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];

    const { address, city, state, country, postalCode, managerCognitoId, ...propertyData } =
      req.body;
    // console.log('files:', files);
    // console.log('files count:', files.length);

    if (!files || files.length === 0) {
      sendBadRequest(res, 'No files uploaded');
      return;
    }

    // Upload images to Cloudinary
    const photoUrls = await Promise.all(
      files.map(async (file) => {
        const url = await uploadToCloudinary(file.buffer, 'properties');
        return url;
      })
    );

    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      street: address,
      city,
      country,
      postalcode: postalCode,
      format: 'json',
      limit: '1',
    }).toString()}`;

    const geocodingResponse = await axios.get(geocodingUrl, {
      headers: { 'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)' },
      timeout: 10000,
    });

    const [longitude, latitude] =
      geocodingResponse.data?.[0]?.lon && geocodingResponse.data?.[0]?.lat
        ? [parseFloat(geocodingResponse.data[0].lon), parseFloat(geocodingResponse.data[0].lat)]
        : [0, 0];

    const [location] = await prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", latitude, longitude)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ${latitude}, ${longitude})
      RETURNING id, address, city, state, country, "postalCode", latitude, longitude;
    `;

    const newProperty = await prisma.property.create({
      data: {
        ...propertyData,
        photoUrls,
        locationId: location.id,
        managerCognitoId,
        amenities:
          typeof propertyData.amenities === 'string'
            ? propertyData.amenities.startsWith('[')
              ? JSON.parse(propertyData.amenities)
              : propertyData.amenities.split(',')
            : [],
        highlights:
          typeof propertyData.highlights === 'string'
            ? propertyData.highlights.startsWith('[')
              ? JSON.parse(propertyData.highlights)
              : propertyData.highlights.split(',')
            : [],
        isPetsAllowed: propertyData.isPetsAllowed === 'true',
        isParkingIncluded: propertyData.isParkingIncluded === 'true',
        pricePerMonth: parseFloat(propertyData.pricePerMonth),
        securityDeposit: parseFloat(propertyData.securityDeposit),
        applicationFee: parseFloat(propertyData.applicationFee),
        beds: parseInt(propertyData.beds),
        baths: parseFloat(propertyData.baths),
        squareFeet: parseInt(propertyData.squareFeet),
      },
      include: { location: true, manager: true },
    });

    // Notify tenants who have favorited properties from this manager
    try {
      const tenantsWithFavorites = await prisma.tenant.findMany({
        where: {
          favorites: {
            some: {
              managerCognitoId: managerCognitoId,
            },
          },
        },
        select: { cognitoId: true },
      });

      if (tenantsWithFavorites.length > 0) {
        await notifyPropertyCreated(
          tenantsWithFavorites.map((t) => t.cognitoId),
          newProperty.manager?.name || 'A manager',
          newProperty.name,
          newProperty.id
        );
      }
    } catch (notifyError) {
      console.info('Error sending property creation notifications:', notifyError);
    }

    // Transform to DTO

    const propertyDTO = toPropertyDetailDTO(newProperty as any);
    sendSuccess(res, propertyDTO, 'Property created successfully', 201);
  } catch (err: any) {
    console.error('Error creating property:', err);
    sendError(res, 'Error creating property', 500, err);
  }
};

const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Number(id);

    const userId = (req as any).user?.id;
    const files = (req.files as Express.Multer.File[]) || [];

    // Verify property exists and belongs to manager
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      sendNotFound(res, 'Property');
      return;
    }

    if (property.managerCognitoId !== userId) {
      sendForbidden(res, 'Not authorized to update this property');
      return;
    }

    const updateData: Record<string, any> = {};

    // Handle basic fields
    const fields = [
      'name',
      'description',
      'pricePerMonth',
      'securityDeposit',
      'applicationFee',
      'beds',
      'baths',
      'squareFeet',
      'propertyType',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (['pricePerMonth', 'securityDeposit', 'applicationFee', 'baths'].includes(field)) {
          updateData[field] = parseFloat(req.body[field]);
        } else if (['beds', 'squareFeet'].includes(field)) {
          updateData[field] = parseInt(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Handle boolean fields
    if (req.body.isPetsAllowed !== undefined) {
      updateData.isPetsAllowed =
        req.body.isPetsAllowed === 'true' || req.body.isPetsAllowed === true;
    }
    if (req.body.isParkingIncluded !== undefined) {
      updateData.isParkingIncluded =
        req.body.isParkingIncluded === 'true' || req.body.isParkingIncluded === true;
    }

    // Handle array fields
    if (req.body.amenities) {
      if (typeof req.body.amenities === 'string') {
        // Check if it's a JSON array string
        updateData.amenities = req.body.amenities.startsWith('[')
          ? JSON.parse(req.body.amenities)
          : req.body.amenities.split(',');
      } else {
        updateData.amenities = req.body.amenities;
      }
    }
    if (req.body.highlights) {
      if (typeof req.body.highlights === 'string') {
        // Check if it's a JSON array string
        updateData.highlights = req.body.highlights.startsWith('[')
          ? JSON.parse(req.body.highlights)
          : req.body.highlights.split(',');
      } else {
        updateData.highlights = req.body.highlights;
      }
    }

    // Handle photos - combine existing photos (after removals) with new uploads
    let finalPhotos: string[] = property.photoUrls;

    // If existingPhotos is provided, use it as the base (user may have removed some)
    if (req.body.existingPhotos !== undefined) {
      const existingPhotos =
        typeof req.body.existingPhotos === 'string'
          ? JSON.parse(req.body.existingPhotos)
          : req.body.existingPhotos;
      finalPhotos = Array.isArray(existingPhotos) ? existingPhotos : [];
    }

    // Add newly uploaded photos
    if (files.length > 0) {
      const newPhotoUrls = await Promise.all(
        files.map(async (file) => {
          const url = await uploadToCloudinary(file.buffer, 'properties');
          return url;
        })
      );
      // Append new photos or replace based on request
      if (req.body.replacePhotos === 'true') {
        finalPhotos = newPhotoUrls;
      } else {
        finalPhotos = [...finalPhotos, ...newPhotoUrls];
      }
    }

    // Always update photoUrls when existingPhotos was provided (even for removals only)
    if (req.body.existingPhotos !== undefined || files.length > 0) {
      updateData.photoUrls = finalPhotos;
    }

    // Handle location update if address fields are provided
    const { address, city, state, country, postalCode } = req.body;
    if (address || city || state || country || postalCode) {
      // Get current location
      const currentLocation = await prisma.location.findUnique({
        where: { id: property.locationId },
      });

      const newAddress = address || currentLocation?.address || '';
      const newCity = city || currentLocation?.city || '';
      const newState = state || currentLocation?.state || '';
      const newCountry = country || currentLocation?.country || '';
      const newPostalCode = postalCode || currentLocation?.postalCode || '';

      // Geocode the new address
      let longitude = currentLocation?.longitude || 0;
      let latitude = currentLocation?.latitude || 0;

      try {
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
          street: newAddress,
          city: newCity,
          country: newCountry,
          postalcode: newPostalCode,
          format: 'json',
          limit: '1',
        }).toString()}`;

        const geocodingResponse = await axios.get(geocodingUrl, {
          headers: { 'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)' },
          timeout: 10000,
        });

        if (geocodingResponse.data?.[0]?.lon && geocodingResponse.data?.[0]?.lat) {
          longitude = parseFloat(geocodingResponse.data[0].lon);
          latitude = parseFloat(geocodingResponse.data[0].lat);
        }
      } catch (geoError) {
        console.info('Geocoding failed, using existing coordinates:', geoError);
      }

      // Update the location
      await prisma.location.update({
        where: { id: property.locationId },
        data: {
          address: newAddress,
          city: newCity,
          state: newState,
          country: newCountry,
          postalCode: newPostalCode,
          latitude,
          longitude,
        },
      });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: updateData,
      include: { location: true, manager: true },
    });

    // Notify tenants living at this property about the update
    try {
      const activeLeases = await prisma.lease.findMany({
        where: {
          propertyId,
          endDate: { gte: new Date() },
        },
        select: { tenantCognitoId: true },
      });

      const changedFields = Object.keys(updateData).filter((key) => key !== 'photoUrls');

      if (activeLeases.length > 0 && changedFields.length > 0) {
        await notifyPropertyUpdated(
          activeLeases.map((l) => l.tenantCognitoId),
          updatedProperty.name,
          propertyId,
          changedFields
        );
      }
    } catch (notifyError) {
      console.info('Error sending property update notifications:', notifyError);
    }

    // Transform to DTO

    const propertyDTO = toPropertyDetailDTO(updatedProperty as any);
    sendSuccess(res, propertyDTO, 'Property updated successfully');
  } catch (err: any) {
    console.error('Error updating property:', err);
    sendError(res, 'Error updating property', 500, err);
  }
};

const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Number(id);

    const userId = (req as any).user?.id;

    // Verify property exists and belongs to manager
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        leases: { where: { endDate: { gte: new Date() } } }, // Active leases
      },
    });

    if (!property) {
      sendNotFound(res, 'Property');
      return;
    }

    if (property.managerCognitoId !== userId) {
      sendForbidden(res, 'Not authorized to delete this property');
      return;
    }

    // Prevent deletion if there are active leases
    if (property.leases && property.leases.length > 0) {
      sendBadRequest(
        res,
        'Cannot delete property with active leases. Please end all leases first.'
      );
      return;
    }

    // Get tenants who favorited this property before deletion
    const tenantsWithFavorite = await prisma.tenant.findMany({
      where: {
        favorites: {
          some: { id: propertyId },
        },
      },
      select: { cognitoId: true },
    });
    const propertyName = property.name;

    // Delete property (cascades to related records via Prisma)
    await prisma.property.delete({
      where: { id: propertyId },
    });

    // Notify tenants who had favorited this property
    try {
      if (tenantsWithFavorite.length > 0) {
        await notifyPropertyDeleted(
          tenantsWithFavorite.map((t) => t.cognitoId),
          propertyName,
          propertyId
        );
      }
    } catch (notifyError) {
      console.info('Error sending property deletion notifications:', notifyError);
    }

    sendSuccess(res, { message: 'Property deleted successfully' }, 'Property deleted successfully');
  } catch (err: any) {
    console.error('Error deleting property:', err);
    sendError(res, 'Error deleting property', 500, err);
  }
};

// Geocode a single property's location
const geocodeProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Number(id);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { location: true },
    });

    if (!property) {
      sendNotFound(res, 'Property');
      return;
    }

    const { address, city, country, postalCode } = property.location;

    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      street: address,
      city,
      country,
      postalcode: postalCode,
      format: 'json',
      limit: '1',
    }).toString()}`;

    const geocodingResponse = await axios.get(geocodingUrl, {
      headers: { 'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)' },
      timeout: 10000,
    });

    const longitude = geocodingResponse.data?.[0]?.lon
      ? parseFloat(geocodingResponse.data[0].lon)
      : 0;
    const latitude = geocodingResponse.data?.[0]?.lat
      ? parseFloat(geocodingResponse.data[0].lat)
      : 0;

    if (longitude === 0 && latitude === 0) {
      sendBadRequest(res, 'Could not geocode this address. Please verify the address is correct.');
      return;
    }

    // Update the location with new coordinates
    const updatedLocation = await prisma.location.update({
      where: { id: property.locationId },
      data: { latitude, longitude },
    });

    sendSuccess(
      res,
      {
        message: 'Property geocoded successfully',
        location: {
          address: updatedLocation.address,
          city: updatedLocation.city,
          state: updatedLocation.state,
          country: updatedLocation.country,
          postalCode: updatedLocation.postalCode,
          coordinates: {
            latitude: updatedLocation.latitude,
            longitude: updatedLocation.longitude,
          },
        },
      },
      'Property geocoded successfully'
    );
  } catch (err: any) {
    console.error('Error geocoding property:', err);
    sendError(res, 'Error geocoding property', 500, err);
  }
};

// Batch geocode all properties with 0,0 coordinates
const batchGeocodeProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all locations with 0,0 coordinates
    const locations = await prisma.location.findMany({
      where: {
        AND: [{ latitude: 0 }, { longitude: 0 }],
      },
    });

    const results = {
      total: locations.length,
      success: 0,
      failed: 0,
      details: [] as {
        id: number;
        city: string;
        status: string;
        coordinates?: { lat: number; lng: number };
      }[],
    };

    for (const location of locations) {
      try {
        // Add delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
          street: location.address,
          city: location.city,
          country: location.country,
          postalcode: location.postalCode,
          format: 'json',
          limit: '1',
        }).toString()}`;

        const geocodingResponse = await axios.get(geocodingUrl, {
          headers: { 'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)' },
          timeout: 10000,
        });

        const longitude = geocodingResponse.data?.[0]?.lon
          ? parseFloat(geocodingResponse.data[0].lon)
          : 0;
        const latitude = geocodingResponse.data?.[0]?.lat
          ? parseFloat(geocodingResponse.data[0].lat)
          : 0;

        if (longitude !== 0 || latitude !== 0) {
          await prisma.location.update({
            where: { id: location.id },
            data: { latitude, longitude },
          });
          results.success++;
          results.details.push({
            id: location.id,
            city: location.city,
            status: 'success',
            coordinates: { lat: latitude, lng: longitude },
          });
        } else {
          results.failed++;
          results.details.push({ id: location.id, city: location.city, status: 'not_found' });
        }
      } catch {
        results.failed++;
        results.details.push({ id: location.id, city: location.city, status: 'error' });
      }
    }

    sendSuccess(res, results, 'Batch geocoding completed');
  } catch (err: any) {
    console.error('Error batch geocoding properties:', err);
    sendError(res, 'Error batch geocoding properties', 500, err);
  }
};

export const PropertyControllers = {
  getProperties,
  getProperty,
  getPropertyLeases,
  createProperty,
  updateProperty,
  deleteProperty,
  geocodeProperty,
  batchGeocodeProperties,
};
