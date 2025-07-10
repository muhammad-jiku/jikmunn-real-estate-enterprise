import express from 'express';
import {
  createApplication,
  listApplications,
  updateApplicationStatus,
} from '../controllers/applicationControllers';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router
  .route('/')
  .post(authMiddleware(['tenant']), createApplication)
  .get(authMiddleware(['manager', 'tenant']), listApplications);

router
  .route('/:id/status')
  .put(authMiddleware(['manager']), updateApplicationStatus);

export default router;
