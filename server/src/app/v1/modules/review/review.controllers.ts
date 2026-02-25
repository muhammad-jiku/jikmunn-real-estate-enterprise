import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { AuditActions, AuditEntities, createAuditLog } from '../../../../lib/auditLog';
import { notifyNewReview } from '../../../../lib/notifications';
import { sendSuccess } from '../../../../lib/response';
import {
  asyncHandler,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../middleware/errorHandler';

const prisma = new PrismaClient();

// Get reviews for a property
const getPropertyReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { propertyId } = req.params;

  const reviews = await prisma.review.findMany({
    where: { propertyId: Number(propertyId) },
    include: {
      tenant: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to DTOs
  const reviewsDTO = reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    tenant: { id: review.tenant.id, name: review.tenant.name },
  }));

  sendSuccess(res, reviewsDTO, 'Property reviews retrieved successfully');
});

// Get all reviews by a tenant
const getTenantReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cognitoId = req.params.cognitoId as string;

  const reviews = await prisma.review.findMany({
    where: { tenantCognitoId: cognitoId },
    include: {
      property: {
        select: { id: true, name: true, photoUrls: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to DTOs
  const reviewsDTO = reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    property: review.property
      ? {
          id: review.property.id,
          name: review.property.name,
          photoUrls: review.property.photoUrls,
        }
      : null,
  }));

  sendSuccess(res, reviewsDTO, 'Tenant reviews retrieved successfully');
});

// Create a review
const createReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { rating, comment, propertyId, tenantCognitoId } = req.body;

  // Check if tenant has lived at/applied to this property
  const tenant = await prisma.tenant.findUnique({
    where: { cognitoId: tenantCognitoId },
    include: {
      leases: {
        where: { propertyId: Number(propertyId) },
      },
    },
  });

  if (!tenant || tenant.leases.length === 0) {
    throw new ForbiddenError('You can only review properties you have rented');
  }

  // Check if already reviewed
  const existingReview = await prisma.review.findUnique({
    where: {
      propertyId_tenantCognitoId: {
        propertyId: Number(propertyId),
        tenantCognitoId,
      },
    },
  });

  if (existingReview) {
    throw new ConflictError('You have already reviewed this property');
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      propertyId: Number(propertyId),
      tenantCognitoId,
    },
    include: {
      property: {
        include: { manager: true },
      },
    },
  });

  // Update property average rating
  const stats = await prisma.review.aggregate({
    where: { propertyId: Number(propertyId) },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.property.update({
    where: { id: Number(propertyId) },
    data: {
      averageRating: stats._avg.rating || 0,
      numberOfReviews: stats._count,
    },
  });

  // Notify manager
  await notifyNewReview(review.property.managerCognitoId, review.property.name, rating, review.id);

  // Audit log
  await createAuditLog({
    action: AuditActions.CREATE,
    entity: AuditEntities.REVIEW,
    entityId: review.id,
    userId: tenantCognitoId,
    userRole: 'tenant',
    newData: { rating, comment, propertyId },
    req,
  });

  // Response DTO
  const reviewDTO = {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    propertyId: review.propertyId,
  };

  sendSuccess(res, reviewDTO, 'Review created successfully', 201);
});

// Update a review
const updateReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user?.id;

  const review = await prisma.review.findUnique({
    where: { id: Number(id) },
  });

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (review.tenantCognitoId !== userId) {
    throw new ForbiddenError('You can only edit your own reviews');
  }

  const oldData = { rating: review.rating, comment: review.comment };

  const updatedReview = await prisma.review.update({
    where: { id: Number(id) },
    data: { rating, comment },
  });

  // Update property average rating
  const stats = await prisma.review.aggregate({
    where: { propertyId: review.propertyId },
    _avg: { rating: true },
  });

  await prisma.property.update({
    where: { id: review.propertyId },
    data: { averageRating: stats._avg.rating || 0 },
  });

  // Audit log
  await createAuditLog({
    action: AuditActions.UPDATE,
    entity: AuditEntities.REVIEW,
    entityId: review.id,
    userId: userId || '',
    userRole: 'tenant',
    oldData,
    newData: { rating, comment },
    req,
  });

  // Response DTO
  const reviewDTO = {
    id: updatedReview.id,
    rating: updatedReview.rating,
    comment: updatedReview.comment,
    updatedAt: updatedReview.updatedAt,
  };

  sendSuccess(res, reviewDTO, 'Review updated successfully');
});

// Delete a review
const deleteReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  const review = await prisma.review.findUnique({
    where: { id: Number(id) },
  });

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (review.tenantCognitoId !== userId) {
    throw new ForbiddenError('You can only delete your own reviews');
  }

  await prisma.review.delete({
    where: { id: Number(id) },
  });

  // Update property stats
  const stats = await prisma.review.aggregate({
    where: { propertyId: review.propertyId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.property.update({
    where: { id: review.propertyId },
    data: {
      averageRating: stats._avg.rating || 0,
      numberOfReviews: stats._count,
    },
  });

  // Audit log
  await createAuditLog({
    action: AuditActions.DELETE,
    entity: AuditEntities.REVIEW,
    entityId: review.id,
    userId: userId || '',
    userRole: 'tenant',
    oldData: { rating: review.rating, comment: review.comment },
    req,
  });

  res.status(204).send();
});

export const ReviewControllers = {
  getPropertyReviews,
  getTenantReviews,
  createReview,
  updateReview,
  deleteReview,
};
