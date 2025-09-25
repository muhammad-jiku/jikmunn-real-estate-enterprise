import express from 'express';
import { auth } from '../../../middleware/auth';
import { TenantControllers } from './tenant.controllers';

const router = express.Router();

router.route('/').post(TenantControllers.createTenant);

router
  .route('/:cognitoId')
  .get(auth(['tenant']), TenantControllers.getTenant)
  .put(auth(['tenant']), TenantControllers.updateTenant);

router
  .route('/:cognitoId/current-residences')
  .get(auth(['tenant']), TenantControllers.getCurrentResidences);

router
  .route('/:cognitoId/favorites/:propertyId')
  .post(auth(['tenant']), TenantControllers.addFavoriteProperty)
  .delete(auth(['tenant']), TenantControllers.removeFavoriteProperty);

export const TenantRoutes = router;
