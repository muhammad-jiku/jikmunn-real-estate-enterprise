import express from 'express';
import { getLeasePayments, getLeases } from '../controllers/leaseControllers';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/').get(authMiddleware(['manager', 'tenant']), getLeases);

router
  .route('/:id/payments')
  .get(authMiddleware(['manager', 'tenant']), getLeasePayments);

export default router;
