import express from 'express';
import multer from 'multer';
import { auth } from '../../../middleware/auth';
import { PropertyControllers } from './property.controllers';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router
  .route('/')
  .post(
    auth(['manager']),
    upload.array('photos'),
    PropertyControllers.createProperty
  )
  .get(PropertyControllers.getProperties);

router.route('/:id').get(PropertyControllers.getProperty);

router
  .route('/:id/leases')
  .get(auth(['manager']), PropertyControllers.getPropertyLeases);

export const PropertyRoutes = router;
