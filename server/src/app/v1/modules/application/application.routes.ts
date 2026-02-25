import express from 'express';
import { auth } from '../../../middleware/auth';
import { ApplicationControllers } from './application.controllers';

const router = express.Router();

router
  .route('/')
  .post(auth(['tenant']), ApplicationControllers.createApplication)
  .get(auth(['manager', 'tenant']), ApplicationControllers.listApplications);

router
  .route('/:id/status')
  .put(auth(['manager']), ApplicationControllers.updateApplicationStatus);

// Get initial payment details for an approved application
router
  .route('/:id/initial-payment')
  .get(auth(['tenant']), ApplicationControllers.getInitialPaymentDetails);

// Complete initial payment (creates lease after payment)
router
  .route('/:id/complete-payment')
  .post(auth(['tenant']), ApplicationControllers.completeInitialPayment);

export const ApplicationRoutes = router;
