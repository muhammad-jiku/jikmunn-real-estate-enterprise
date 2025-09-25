import express from 'express';
import { auth } from '../../../middleware/auth';
import { LeaseControllers } from './lease.controllers';

const router = express.Router();

router.route('/').get(auth(['manager', 'tenant']), LeaseControllers.getLeases);

router
  .route('/:id/payments')
  .get(auth(['manager', 'tenant']), LeaseControllers.getLeasePayments);

export const LeaseRoutes = router;
