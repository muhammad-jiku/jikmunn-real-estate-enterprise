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

// Batch geocode all properties with 0,0 coordinates (admin operation)
router.post('/geocode-all', auth(['manager']), PropertyControllers.batchGeocodeProperties);

router
  .route('/:id')
  .get(PropertyControllers.getProperty)
  .put(
    auth(['manager']),
    upload.array('photos'),
    PropertyControllers.updateProperty
  )
  .delete(auth(['manager']), PropertyControllers.deleteProperty);

// Geocode a single property
router.post('/:id/geocode', auth(['manager']), PropertyControllers.geocodeProperty);

router
  .route('/:id/leases')
  .get(auth(['manager']), PropertyControllers.getPropertyLeases);

export const PropertyRoutes = router;
