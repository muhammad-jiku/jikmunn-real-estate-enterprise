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

export const ApplicationRoutes = router;
