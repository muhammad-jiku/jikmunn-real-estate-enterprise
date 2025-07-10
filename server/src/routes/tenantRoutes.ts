import express from 'express';
import {
  addFavoriteProperty,
  createTenant,
  getCurrentResidences,
  getTenant,
  removeFavoriteProperty,
  updateTenant,
} from '../controllers/tenantControllers';

const router = express.Router();

router.route('/').post(createTenant);

router.route('/:cognitoId').get(getTenant).put(updateTenant);

router.route('/:cognitoId/current-residences').get(getCurrentResidences);

router
  .route('/:cognitoId/favorites/:propertyId')
  .post(addFavoriteProperty)
  .delete(removeFavoriteProperty);

export default router;
