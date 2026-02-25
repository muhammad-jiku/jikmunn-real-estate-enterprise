import { z } from 'zod';

// ===============================
// Property Schemas
// ===============================
export const createPropertySchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    description: z.string().min(10).max(2000),
    pricePerMonth: z.number().positive(),
    securityDeposit: z.number().nonnegative(),
    applicationFee: z.number().nonnegative(),
    amenities: z.array(z.string()).optional(),
    highlights: z.array(z.string()).optional(),
    isPetsAllowed: z.boolean().optional(),
    isParkingIncluded: z.boolean().optional(),
    beds: z.number().int().min(0),
    baths: z.number().min(0),
    squareFeet: z.number().int().positive(),
    propertyType: z.enum(['Rooms', 'Tinyhouse', 'Apartment', 'Villa', 'Townhouse', 'Cottage']),
    address: z.string().min(5),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2),
    postalCode: z.string().min(3),
    managerCognitoId: z.string(),
  }),
});

export const updatePropertySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    pricePerMonth: z.number().positive().optional(),
    securityDeposit: z.number().nonnegative().optional(),
    applicationFee: z.number().nonnegative().optional(),
    amenities: z.array(z.string()).optional(),
    highlights: z.array(z.string()).optional(),
    isPetsAllowed: z.boolean().optional(),
    isParkingIncluded: z.boolean().optional(),
    beds: z.number().int().min(0).optional(),
    baths: z.number().min(0).optional(),
    squareFeet: z.number().int().positive().optional(),
    propertyType: z
      .enum(['Rooms', 'Tinyhouse', 'Apartment', 'Villa', 'Townhouse', 'Cottage'])
      .optional(),
  }),
});

// ===============================
// Review Schemas
// ===============================
export const createReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    propertyId: z.number().int().positive(),
    tenantCognitoId: z.string(),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(1000).optional(),
  }),
});

// ===============================
// Maintenance Request Schemas
// ===============================
export const createMaintenanceSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(100),
    description: z.string().min(10).max(2000),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
    propertyId: z.number().int().positive(),
    tenantCognitoId: z.string(),
    attachments: z.array(z.string().url()).optional(),
  }),
});

export const updateMaintenanceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  body: z.object({
    status: z.enum(['Pending', 'InProgress', 'Completed', 'Cancelled']).optional(),
    resolution: z.string().max(2000).optional(),
  }),
});

// ===============================
// Message Schemas
// ===============================
export const createMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000),
    propertyId: z.number().int().positive().optional(),
    receiverCognitoId: z.string(),
    receiverType: z.enum(['tenant', 'manager']),
  }),
});

// ===============================
// Payment Schemas
// ===============================
export const createPaymentIntentSchema = z.object({
  body: z.object({
    leaseId: z.number().int().positive(),
    amount: z.number().positive(),
    paymentType: z.enum(['rent', 'deposit', 'applicationFee']).optional(),
  }),
});

export const createManualPaymentSchema = z.object({
  body: z.object({
    leaseId: z.number().int().positive(),
    amountPaid: z.number().positive(),
    paymentDate: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    notes: z.string().max(500).optional(),
  }),
});

// ===============================
// Application Schemas
// ===============================
export const createApplicationSchema = z.object({
  body: z.object({
    propertyId: z.number().int().positive(),
    tenantCognitoId: z.string(),
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phoneNumber: z.string().min(10).max(20),
    message: z.string().max(1000).optional(),
  }),
});

export const updateApplicationStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
  body: z.object({
    status: z.enum(['Pending', 'Approved', 'Denied']),
  }),
});

// ===============================
// User Schemas
// ===============================
export const updateUserSchema = z.object({
  params: z.object({
    cognitoId: z.string(),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().min(10).max(20).optional(),
  }),
});

// Types
export type CreatePropertyInput = z.infer<typeof createPropertySchema>['body'];
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>['body'];
export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>['body'];
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>['body'];
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>['body'];
export type CreateMessageInput = z.infer<typeof createMessageSchema>['body'];
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>['body'];
export type CreateManualPaymentInput = z.infer<typeof createManualPaymentSchema>['body'];
