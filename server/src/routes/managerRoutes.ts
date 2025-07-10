import express from 'express';
import {
  createManager,
  getManager,
  getManagerProperties,
  updateManager,
} from '../controllers/managerControllers';

const router = express.Router();

router.route('/').post(createManager);

router.route('/:cognitoId').get(getManager).put(updateManager);

router.route('/:cognitoId/properties').get(getManagerProperties);

export default router;
