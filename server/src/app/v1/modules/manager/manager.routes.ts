import express from 'express';
import { auth } from '../../../middleware/auth';
import { ManagerControllers } from './manager.controllers';

const router = express.Router();

router.route('/').post(ManagerControllers.createManager);

router
  .route('/:cognitoId')
  .get(auth(['manager']), ManagerControllers.getManager)
  .put(auth(['manager']), ManagerControllers.updateManager);

router
  .route('/:cognitoId/properties')
  .get(auth(['manager']), ManagerControllers.getManagerProperties);

export const ManagerRoutes = router;
