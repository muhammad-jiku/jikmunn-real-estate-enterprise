/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

async function insertLocationData(locations: any[]) {
  for (const location of locations) {
    const { id, country, city, state, address, postalCode, latitude, longitude } = location;
    try {
      await prisma.$executeRaw`
        INSERT INTO "Location" ("id", "country", "city", "state", "address", "postalCode", "latitude", "longitude") 
        VALUES (${id}, ${country}, ${city}, ${state}, ${address}, ${postalCode}, ${latitude}, ${longitude});
      `;
      console.log(`Inserted location for ${city}`);
    } catch (error) {
      console.error(`Error inserting location for ${city}:`, error);
    }
  }
}

async function insertManagerData(managers: any[]) {
  for (const manager of managers) {
    const { id, cognitoId, name, email, phoneNumber } = manager;
    try {
      await prisma.$executeRaw`
        INSERT INTO "Manager" ("id", "cognitoId", "name", "email", "phoneNumber") 
        VALUES (${id}, ${cognitoId}, ${name}, ${email}, ${phoneNumber});
      `;
      console.log(`Inserted manager: ${name}`);
    } catch (error) {
      console.error(`Error inserting manager ${name}:`, error);
    }
  }
}

async function insertPropertyData(properties: any[]) {
  for (const property of properties) {
    const {
      id,
      name,
      description,
      pricePerMonth,
      securityDeposit,
      applicationFee,
      photoUrls,
      amenities,
      highlights,
      isPetsAllowed,
      isParkingIncluded,
      beds,
      baths,
      squareFeet,
      propertyType,
      postedDate,
      averageRating,
      numberOfReviews,
      locationId,
      managerCognitoId,
    } = property;
    try {
      await prisma.$executeRaw`
        INSERT INTO "Property" (
          "id", "name", "description", "pricePerMonth", "securityDeposit", "applicationFee",
          "photoUrls", "amenities", "highlights", "isPetsAllowed", "isParkingIncluded",
          "beds", "baths", "squareFeet", "propertyType", "postedDate", "averageRating",
          "numberOfReviews", "locationId", "managerCognitoId"
        ) VALUES (
          ${id}, ${name}, ${description}, ${pricePerMonth}, ${securityDeposit}, ${applicationFee},
          ${photoUrls}, ${amenities}::"Amenity"[], ${highlights}::"Highlight"[], ${isPetsAllowed}, ${isParkingIncluded},
          ${beds}, ${baths}, ${squareFeet}, ${propertyType}::"PropertyType", ${postedDate}::timestamp, ${averageRating},
          ${numberOfReviews}, ${locationId}, ${managerCognitoId}
        );
      `;
      console.log(`Inserted property: ${name}`);
    } catch (error) {
      console.error(`Error inserting property ${name}:`, error);
    }
  }
}

async function insertTenantData(tenants: any[]) {
  for (const tenant of tenants) {
    const { id, cognitoId, name, email, phoneNumber, properties, favorites } = tenant;
    try {
      // Insert base tenant record
      await prisma.$executeRaw`
        INSERT INTO "Tenant" ("id", "cognitoId", "name", "email", "phoneNumber") 
        VALUES (${id}, ${cognitoId}, ${name}, ${email}, ${phoneNumber});
      `;

      // Handle property connections (TenantProperties relation)
      if (properties?.connect) {
        for (const prop of properties.connect) {
          if (prop.id) {
            await prisma.$executeRaw`
              INSERT INTO "_TenantProperties" ("A", "B") VALUES (${prop.id}, ${id});
            `;
          }
        }
      }

      // Handle favorites connections (TenantFavorites relation)
      if (favorites?.connect) {
        for (const fav of favorites.connect) {
          if (fav.id) {
            await prisma.$executeRaw`
              INSERT INTO "_TenantFavorites" ("A", "B") VALUES (${fav.id}, ${id});
            `;
          }
        }
      }

      console.log(`Inserted tenant: ${name}`);
    } catch (error) {
      console.error(`Error inserting tenant ${name}:`, error);
    }
  }
}

async function insertLeaseData(leases: any[]) {
  for (const lease of leases) {
    const { id, startDate, endDate, rent, deposit, propertyId, tenantCognitoId } = lease;
    try {
      await prisma.$executeRaw`
        INSERT INTO "Lease" ("id", "startDate", "endDate", "rent", "deposit", "propertyId", "tenantCognitoId") 
        VALUES (${id}, ${startDate}::timestamp, ${endDate}::timestamp, ${rent}, ${deposit}, ${propertyId}, ${tenantCognitoId});
      `;
      console.log(`Inserted lease: ${id}`);
    } catch (error) {
      console.error(`Error inserting lease ${id}:`, error);
    }
  }
}

async function resetSequence(modelName: string) {
  const quotedModelName = `"${toPascalCase(modelName)}"`;

  const maxIdResult = await (prisma[modelName as keyof PrismaClient] as any).findMany({
    select: { id: true },
    orderBy: { id: 'desc' },
    take: 1,
  });

  if (maxIdResult.length === 0) return;

  const nextId = maxIdResult[0].id + 1;
  await prisma.$executeRaw(
    Prisma.raw(`
    SELECT setval(pg_get_serial_sequence('${quotedModelName}', 'id'), coalesce(max(id)+1, ${nextId}), false) FROM ${quotedModelName};
  `)
  );
  console.log(`Reset sequence for ${modelName} to ${nextId}`);
}

async function deleteAllData(orderedFileNames: string[]) {
  // Delete all dependent tables first (tables with foreign keys to main tables)
  const dependentModels = [
    'auditLog',
    'notification',
    'message',
    'maintenanceRequest',
    'review',
    'payment',
    'application',
    'lease',
  ];

  for (const modelNameCamel of dependentModels) {
    const model = (prisma as any)[modelNameCamel];
    if (!model) {
      console.error(`Model ${modelNameCamel} not found in Prisma client`);
      continue;
    }
    try {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelNameCamel}`);
    } catch (error) {
      console.error(`Error clearing data from ${modelNameCamel}:`, error);
    }
  }

  // Clear tenant favorites and properties relations
  try {
    await prisma.$executeRaw`DELETE FROM "_TenantFavorites"`;
    console.log('Cleared _TenantFavorites relation');
  } catch (error) {
    console.error('Error clearing _TenantFavorites:', error);
  }

  try {
    await prisma.$executeRaw`DELETE FROM "_TenantProperties"`;
    console.log('Cleared _TenantProperties relation');
  } catch (error) {
    console.error('Error clearing _TenantProperties:', error);
  }

  // Now delete main tables in reverse order
  const modelNames = orderedFileNames.map((fileName) => {
    return toPascalCase(path.basename(fileName, path.extname(fileName)));
  });

  for (const modelName of modelNames.reverse()) {
    const modelNameCamel = toCamelCase(modelName);
    const model = (prisma as any)[modelNameCamel];
    if (!model) {
      console.error(`Model ${modelName} not found in Prisma client`);
      continue;
    }
    try {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } catch (error) {
      console.error(`Error clearing data from ${modelName}:`, error);
    }
  }
}

async function main() {
  const dataDirectory = path.join(__dirname, 'seedData');

  const orderedFileNames = [
    'location.json', // No dependencies
    'manager.json', // No dependencies
    'property.json', // Depends on location and manager
    'tenant.json', // No dependencies
    'lease.json', // Depends on property and tenant
    'application.json', // Depends on property and tenant
    'payment.json', // Depends on lease
  ];

  // Delete all existing data
  await deleteAllData(orderedFileNames);

  // Seed data
  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const modelName = toPascalCase(path.basename(fileName, path.extname(fileName)));
    const modelNameCamel = toCamelCase(modelName);

    if (modelName === 'Location') {
      await insertLocationData(jsonData);
    } else if (modelName === 'Manager') {
      await insertManagerData(jsonData);
    } else if (modelName === 'Property') {
      await insertPropertyData(jsonData);
    } else if (modelName === 'Tenant') {
      await insertTenantData(jsonData);
    } else if (modelName === 'Lease') {
      await insertLeaseData(jsonData);
    } else {
      // For Application and Payment: strip `id` field before create()
      const model = (prisma as any)[modelNameCamel];
      try {
        for (const item of jsonData) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...dataWithoutId } = item;
          await model.create({
            data: dataWithoutId,
          });
        }
        console.log(`Seeded ${modelName} with data from ${fileName}`);
      } catch (error) {
        console.error(`Error seeding data for ${modelName}:`, error);
      }
    }

    // Reset the sequence after seeding each model
    await resetSequence(modelName);

    await sleep(1000);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
