import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Location, Prisma, PrismaClient } from '@prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';
import axios from 'axios';
import { Request, Response } from 'express';
import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs/promises';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/** Helpers **/
const sanitizeFilename = (filename: string): string =>
  filename
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();

const buildS3Url = (bucket: string, region: string, key: string) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;

const looksLikeImage = (buf: Buffer) => {
  if (!buf || buf.length < 4) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // jpeg
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return true; // png
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46)
    return true; // webp (RIFF)
  return false;
};

const ensureBuffer = (input: Buffer | string): Buffer => {
  if (Buffer.isBuffer(input)) return input;
  const str = input as string;
  try {
    const b = Buffer.from(str, 'base64');
    if (looksLikeImage(b)) return b;
  } catch {}
  try {
    const b = Buffer.from(str, 'binary');
    if (looksLikeImage(b)) return b;
  } catch {}
  return Buffer.from(str);
};

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
): Promise<void> => {
  try {
    const form = new IncomingForm({
      multiples: true,
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      try {
        console.log('err:', err);
        if (err) throw err;
        console.log('fields:', fields);
        console.log('files:', files);

        // Extract form fields (properties)
        const {
          address,
          city,
          state,
          country,
          postalCode,
          managerCognitoId,
          ...propertyData
        } = fields as any;
        console.log('received property data:', fields);

        // console.log(
        //   'AWS keys present?',
        //   !!process.env.AWS_REGION,
        //   !!process.env.S3_BUCKET_NAME,
        //   !!process.env.AWS_ACCESS_KEY_ID,
        //   !!process.env.AWS_SECRET_ACCESS_KEY
        // );

        // Normalize files.photos (could be single or array)
        let incomingFiles: FormidableFile[] = [];
        if (!files || !files.photos) {
          return res.status(400).json({ message: 'No files uploaded' });
        }

        if (Array.isArray(files.photos))
          incomingFiles = files.photos as FormidableFile[];
        else incomingFiles = [files.photos as unknown as FormidableFile];

        const photoUrls = await Promise.all(
          incomingFiles.map(async (f) => {
            // Read temp file into Buffer
            const filePath = (f as any).filepath || (f as any).path;
            const raw = await fs.readFile(filePath);
            const bodyBuffer = ensureBuffer(raw);
            console.log('Uploading', f.originalFilename || f.newFilename, {
              size: bodyBuffer.byteLength,
              looksLikeImage: looksLikeImage(bodyBuffer),
            });
            console.log('incoming files.photos:', files.photos);

            const sanitizedFilename = sanitizeFilename(
              (f as any).originalFilename || (f as any).newFilename || 'upload'
            );
            console.log('sanitizedFilename:', sanitizedFilename);
            const key = `properties/${Date.now()}-${sanitizedFilename}`;
            // const key = `${ Date.now() }-${ sanitizedFilename }`;

            const params: any = {
              Bucket: process.env.S3_BUCKET_NAME!,
              Key: key,
              Body: bodyBuffer,
              ContentType:
                (f as any).mimetype ||
                (f as any).type ||
                'application/octet-stream',
              ContentLength: bodyBuffer.byteLength,
              CacheControl: 'max-age=31536000',
              Metadata: {
                'uploaded-by': 'api',
              },
            };
            console.log('params:', params);

            const uploadResult = await new Upload({
              client: s3Client,
              params,
            }).done();
            console.log('UploadResult:', uploadResult);

            try {
              const head = await s3Client.send(
                new HeadObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME!,
                  Key: key,
                })
              );
              console.log('HeadObject:', {
                Key: key,
                ContentLength: head.ContentLength,
                ContentType: head.ContentType,
                ServerSideEncryption: head.ServerSideEncryption,
              });
            } catch (hErr) {
              console.log('HeadObject failed for', key, hErr);
            }

            return buildS3Url(
              process.env.S3_BUCKET_NAME!,
              process.env.AWS_REGION || 'ap-southeast-1',
              key
            );
          })
        );

        // Geocoding
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
          {
            street: address as string,
            city: city as string,
            country: country as string,
            postalcode: postalCode as string,
            format: 'json',
            limit: '1',
          }
        ).toString()}`;
        // console.log('Geocoding URL:', geocodingUrl);

        const geocodingResponse = await axios.get(geocodingUrl, {
          headers: {
            'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)',
          },
        });
        // console.log('Geocoding response:', geocodingResponse);
        // console.log('Geocoding response data:', geocodingResponse.data);

        const [longitude, latitude] =
          geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat
            ? [
                parseFloat(geocodingResponse.data[0].lon),
                parseFloat(geocodingResponse.data[0].lat),
              ]
            : [0, 0];
        // console.log('Geocoded coordinates:', { longitude, latitude });

        // create location
        const [location] = await prisma.$queryRaw<Location[]>`
            INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
            VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
            RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
          `;
        console.log('New location created:', location);

        const newProperty = await prisma.property.create({
          data: {
            ...propertyData,
            photoUrls,
            locationId: location.id,
            managerCognitoId: managerCognitoId as string,
            amenities:
              typeof (propertyData as any).amenities === 'string'
                ? (propertyData as any).amenities.split(',')
                : [],
            highlights:
              typeof (propertyData as any).highlights === 'string'
                ? (propertyData as any).highlights.split(',')
                : [],
            isPetsAllowed: (propertyData as any).isPetsAllowed === 'true',
            isParkingIncluded:
              (propertyData as any).isParkingIncluded === 'true',
            pricePerMonth: parseFloat((propertyData as any).pricePerMonth),
            securityDeposit: parseFloat((propertyData as any).securityDeposit),
            applicationFee: parseFloat((propertyData as any).applicationFee),
            beds: parseInt((propertyData as any).beds),
            baths: parseFloat((propertyData as any).baths),
            squareFeet: parseInt((propertyData as any).squareFeet),
          },
          include: {
            location: true,
            manager: true,
          },
        });
        console.log('New property created:', newProperty);

        res.status(201).json(newProperty);
      } catch (innerErr: any) {
        console.log('Error parsing or uploading:', innerErr);
        res.status(500).json({ message: innerErr.message || 'Upload error' });
      }
    });
  } catch (err: any) {
    console.log('Error creating property:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// export const createProperty = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
// try {
//   const files = req.files as Express.Multer.File[];
//   const {
//     address,
//     city,
//     state,
//     country,
//     postalCode,
//     managerCognitoId,
//     ...propertyData
//   } = req.body;
//   // console.log('received property data:', req.body);

//   // console.log(
//   //   'AWS keys present?',
//   //   !!process.env.AWS_REGION,
//   //   !!process.env.S3_BUCKET_NAME,
//   //   !!process.env.AWS_ACCESS_KEY_ID,
//   //   !!process.env.AWS_SECRET_ACCESS_KEY
//   // );

//   // Helper function to sanitize filename
//   const sanitizeFilename = (filename: string): string => {
//     return filename
//       .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
//       .replace(/_{2,}/g, '_') // Replace multiple underscores with single
//       .toLowerCase();
//   };

//   const photoUrls = await Promise.all(
//     files.map(async (file) => {
//       const sanitizedFilename = sanitizeFilename(file.originalname);
//       const key = `properties/${Date.now()}-${sanitizedFilename}`; // Keep properties/ dir
//       // const key = `${Date.now()}-${sanitizedFilename}`; // Without properties/ dir

//       const uploadParams = {
//         Bucket: process.env.S3_BUCKET_NAME!,
//         Key: key,
//         Body: file.buffer,
//         ContentType: file.mimetype,
//         CacheControl: 'max-age=31536000',
//         Metadata: {
//           'uploaded-by': 'api',
//         },
//       };

//       const uploadResult = await new Upload({
//         client: s3Client,
//         params: uploadParams,
//       }).done();
//       console.log('Upload result:', uploadResult);
//       console.log('Upload result Location:', uploadResult.Location);

//       // Use the Location directly from AWS response or Construct the public URL manually to ensure consistency
//       return (
//         uploadResult.Location ||
//         `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
//       );
//     })
//   );
//   console.log('Photo URLs:', photoUrls);

//   const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
//     {
//       street: address,
//       city,
//       country,
//       postalcode: postalCode,
//       format: 'json',
//       limit: '1',
//     }
//   ).toString()}`;
//   // console.log('Geocoding URL:', geocodingUrl);

//   const geocodingResponse = await axios.get(geocodingUrl, {
//     headers: {
//       'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)',
//     },
//   });
//   // console.log('Geocoding response data:', geocodingResponse.data);

//   const [longitude, latitude] =
//     geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat
//       ? [
//           parseFloat(geocodingResponse.data[0]?.lon),
//           parseFloat(geocodingResponse.data[0]?.lat),
//         ]
//       : [0, 0];
//   // console.log('Geocoded coordinates:', { longitude, latitude });

//   // create location
//   const [location] = await prisma.$queryRaw<Location[]>`
//     INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
//     VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
//     RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
//   `;
//   // console.log('New location created:', location);

//   // create property
//   const newProperty = await prisma.property.create({
//     data: {
//       ...propertyData,
//       photoUrls,
//       locationId: location.id,
//       managerCognitoId,
//       amenities:
//         typeof propertyData.amenities === 'string'
//           ? propertyData.amenities.split(',')
//           : [],
//       highlights:
//         typeof propertyData.highlights === 'string'
//           ? propertyData.highlights.split(',')
//           : [],
//       isPetsAllowed: propertyData.isPetsAllowed === 'true',
//       isParkingIncluded: propertyData.isParkingIncluded === 'true',
//       pricePerMonth: parseFloat(propertyData.pricePerMonth),
//       securityDeposit: parseFloat(propertyData.securityDeposit),
//       applicationFee: parseFloat(propertyData.applicationFee),
//       beds: parseInt(propertyData.beds),
//       baths: parseFloat(propertyData.baths),
//       squareFeet: parseInt(propertyData.squareFeet),
//     },
//     include: {
//       location: true,
//       manager: true,
//     },
//   });
//   console.log('New property created:', newProperty);

//   res.status(201).json(newProperty);
// } catch (err: any) {
//   console.log('Error creating property:', err);
//   res
//     .status(500)
//     .json({ message: `Error creating property: ${err.message}` });
// }
// };
