import express from 'express';
import { createMaintenanceSchema, updateMaintenanceSchema } from '../../../../lib/validators';
import { auth } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { MaintenanceControllers } from './maintenance.controllers';

const router = express.Router();

// Tenant routes
router.get('/tenant/:cognitoId', auth(['tenant']), MaintenanceControllers.getTenantRequests);
router.post(
  '/',
  auth(['tenant']),
  validate(createMaintenanceSchema),
  MaintenanceControllers.createRequest
);

// Manager routes
router.get('/property/:propertyId', auth(['manager']), MaintenanceControllers.getPropertyRequests);
router.get('/manager/:cognitoId', auth(['manager']), MaintenanceControllers.getManagerRequests);
router.put(
  '/:id',
  auth(['manager']),
  validate(updateMaintenanceSchema),
  MaintenanceControllers.updateRequest
);

export const MaintenanceRoutes = router;
