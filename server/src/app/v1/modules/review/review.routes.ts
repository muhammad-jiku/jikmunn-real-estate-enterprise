import express from 'express';
import { createReviewSchema, updateReviewSchema } from '../../../../lib/validators';
import { auth } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { ReviewControllers } from './review.controllers';

const router = express.Router();

// Get reviews for a property (public)
router.get('/property/:propertyId', ReviewControllers.getPropertyReviews);

// Get reviews by tenant
router.get('/tenant/:cognitoId', auth(['tenant']), ReviewControllers.getTenantReviews);

// Create review (tenant only)
router.post('/', auth(['tenant']), validate(createReviewSchema), ReviewControllers.createReview);

// Update review (tenant only, own review)
router.put('/:id', auth(['tenant']), validate(updateReviewSchema), ReviewControllers.updateReview);

// Delete review (tenant only, own review)
router.delete('/:id', auth(['tenant']), ReviewControllers.deleteReview);

export const ReviewRoutes = router;
