import express from 'express';
import multer from 'multer';
import {
  createProperty,
  getProperties,
  getProperty,
} from '../controllers/propertyControllers';
import { authMiddleware } from '../middleware/authMiddleware';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router
  .route('/')
  .post(authMiddleware(['manager']), upload.array('photos'), createProperty)
  .get(getProperties);

router.route('/:id').get(getProperty);

export default router;
