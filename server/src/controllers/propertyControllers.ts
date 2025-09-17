import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Location, Prisma, PrismaClient } from '@prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';
import axios from 'axios';
import { Request, Response } from 'express';
import multer from 'multer';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/** Multer setup (memoryStorage) **/
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only jpg, jpeg, png and webp files are allowed'));
    }
    cb(null, true);
  },
});

/** Helpers **/
const sanitizeFilename = (filename: string): string =>
  filename
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();

// const buildS3Url = (bucket: string, region: string, key: string) =>
//   `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;

// const looksLikeImage = (buf: Buffer) => {
//   if (!buf || buf.length < 4) return false;
//   if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // jpg
//   if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
//     return true; // png
//   if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46)
//     return true; // webp (RIFF)
//   return false;
// };

/**
 * Accept Buffer | string (rare) and try decodes; return Buffer
 */
// const ensureBuffer = (input: Buffer | string): Buffer => {
//   if (Buffer.isBuffer(input)) return input;
//   const str = input as string;
//   try {
//     const b = Buffer.from(str, 'base64');
//     if (looksLikeImage(b)) return b;
//   } catch {}
//   try {
//     const b = Buffer.from(str, 'binary');
//     if (looksLikeImage(b)) return b;
//   } catch {}
//   return Buffer.from(str);
// };

/** Utility: hex string for debug */
// const hex = (b: Buffer) => b.toString('hex');

/** Replacement bytes constant */
// const REPLACEMENT_SEQ = Buffer.from([0xef, 0xbf, 0xbd]);

/**
 * Heuristic: try to repair a buffer that has leading EF BF BD replacement bytes.
 * - Search for PNG / JFIF / Exif / WEBP markers later in the buffer and reconstruct a plausible header.
 * - If nothing found, strip leading repeated replacement sequences and return remainder.
 *
 * This is a fallback / temporary repair — not a substitute for fixing the root cause.
 */
// function tryRepairBuffer(buf: Buffer) {
//   // quick check: if no replacement bytes at front or in first chunk, return as-is
//   const firstSlice = buf.slice(0, 12);
//   if (
//     !firstSlice.includes(REPLACEMENT_SEQ[0]) &&
//     !firstSlice.includes(REPLACEMENT_SEQ[1]) &&
//     !firstSlice.includes(REPLACEMENT_SEQ[2])
//   ) {
//     return { repaired: false, buffer: buf };
//   }

//   // Look for PNG ("504e47" = "PNG")
//   const pngIdx = buf.indexOf(Buffer.from('504e47', 'hex'));
//   if (pngIdx !== -1) {
//     // prepend the PNG magic 0x89 then from pngIdx onward
//     const repaired = Buffer.concat([Buffer.from([0x89]), buf.slice(pngIdx)]);
//     return { repaired: true, buffer: repaired };
//   }

//   // Look for JFIF ("4a464946") or "Exif" ("45786966")
//   const jfifIdx = buf.indexOf(Buffer.from('4a464946', 'hex'));
//   const exifIdx = buf.indexOf(Buffer.from('45786966', 'hex'));
//   const markerIndex = jfifIdx !== -1 ? jfifIdx : exifIdx !== -1 ? exifIdx : -1;
//   if (markerIndex !== -1) {
//     // Usually JFIF appears after some small header bytes; attempt to create JPEG header FFD8FF then attach tail
//     const tail = buf.slice(Math.max(0, markerIndex - 2)); // include couple of bytes before marker
//     const header = Buffer.from([0xff, 0xd8, 0xff]);
//     const repaired = Buffer.concat([header, tail]);
//     return { repaired: true, buffer: repaired };
//   }

//   // Look for "WEBP" marker (57454250)
//   const webpIdx = buf.indexOf(Buffer.from('57454250', 'hex'));
//   if (webpIdx !== -1) {
//     const riffIdx = buf.indexOf(Buffer.from('52494646', 'hex')); // RIFF
//     const start = riffIdx !== -1 ? riffIdx : webpIdx;
//     const repaired = buf.slice(start);
//     return { repaired: true, buffer: repaired };
//   }

//   // Fallback: strip leading repeated replacement sequences
//   let pos = 0;
//   while (buf.slice(pos, pos + 3).equals(REPLACEMENT_SEQ)) pos += 3;
//   if (pos > 0 && pos < buf.length) {
//     const repaired = buf.slice(pos);
//     return { repaired: true, buffer: repaired };
//   }

//   return { repaired: false, buffer: buf };
// }

export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    } = req.query;
    // console.log('req.query::', req.query);

    let whereConditions: Prisma.Sql[] = [];

    if (favoriteIds) {
      const favoriteIdsArray = (favoriteIds as string).split(',').map(Number);
      whereConditions.push(
        Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`
      );
    }

    if (priceMin) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`
      );
    }

    if (priceMax) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`
      );
    }

    if (beds && beds !== 'any') {
      whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`);
    }

    if (baths && baths !== 'any') {
      whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`);
    }

    if (squareFeetMin) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`
      );
    }

    if (squareFeetMax) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`
      );
    }

    if (propertyType && propertyType !== 'any') {
      whereConditions.push(
        Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`
      );
    }

    if (amenities && amenities !== 'any') {
      const amenitiesArray = (amenities as string).split(',');
      whereConditions.push(Prisma.sql`p.amenities @> ${amenitiesArray}`);
    }

    if (availableFrom && availableFrom !== 'any') {
      const availableFromDate =
        typeof availableFrom === 'string' ? availableFrom : null;
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

    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInKilometers = 1000;
      const degrees = radiusInKilometers / 111; // Converts kilometers to degrees

      whereConditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates::geometry,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${degrees}
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
            'longitude', ST_X(l."coordinates"::geometry),
            'latitude', ST_Y(l."coordinates"::geometry)
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
    // console.log('get all properties:', properties);

    res.json(properties);
  } catch (error: any) {
    // console.log('properties error:', error);
    res
      .status(500)
      .json({ message: `Error retrieving properties: ${error.message}` });
  }
};

export const getProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    // console.log('id:', id);

    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
      include: {
        location: true,
      },
    });
    // console.log('property:', property);

    if (property) {
      const coordinates: { coordinates: string }[] =
        await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

      const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || '');
      const longitude = geoJSON.coordinates[0];
      const latitude = geoJSON.coordinates[1];

      const propertyWithCoordinates = {
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude,
            latitude,
          },
        },
      };
      // console.log('propertyWithCoordinates:', propertyWithCoordinates);

      res.json(propertyWithCoordinates);
    }
  } catch (err: any) {
    // console.log('error retrieving property:', err);
    res
      .status(500)
      .json({ message: `Error retrieving property: ${err.message}` });
  }
};

export const createProperty = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      managerCognitoId,
      ...propertyData
    } = req.body as any;
    console.log('req.body::', req.body);
    console.log('files::', files);

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const photoUrls = await Promise.all(
      files.map(async (file) => {
        const sanitizedFilename = sanitizeFilename(file.originalname);
        const key = `properties/${Date.now()}-${sanitizedFilename}`;

        const uploadParams = {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read' as const,
          CacheControl: 'max-age=31536000',
        };
        console.log('uploade params:', uploadParams);

        const uploadResult = await new Upload({
          client: s3Client,
          params: uploadParams,
        }).done();
        console.log('Upload result:', uploadResult);

        return (
          uploadResult.Location ||
          `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
        );
      })
    );
    console.log('photoUrls::', photoUrls);

    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
      {
        street: address,
        city,
        country,
        postalcode: postalCode,
        format: 'json',
        limit: '1',
      }
    ).toString()}`;

    const geocodingResponse = await axios.get(geocodingUrl, {
      headers: { 'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)' },
      timeout: 10000,
    });
    // console.log('Geocoding response data:', geocodingResponse.data);

    const [longitude, latitude] =
      geocodingResponse.data?.[0]?.lon && geocodingResponse.data?.[0]?.lat
        ? [
            parseFloat(geocodingResponse.data[0].lon),
            parseFloat(geocodingResponse.data[0].lat),
          ]
        : [0, 0];
    // console.log('Geocoding result:', { longitude, latitude });

    const [location] = await prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;
    // console.log('new location created', location);

    const newProperty = await prisma.property.create({
      data: {
        ...propertyData,
        photoUrls,
        locationId: location.id,
        managerCognitoId,
        amenities:
          typeof propertyData.amenities === 'string'
            ? propertyData.amenities.split(',')
            : [],
        highlights:
          typeof propertyData.highlights === 'string'
            ? propertyData.highlights.split(',')
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
    // console.log('new property created', newProperty);

    return res.status(201).json(newProperty);
  } catch (err: any) {
    console.log('Error creating property:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};
