import express from 'express';
import { createMessageSchema } from '../../../../lib/validators';
import { auth } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { MessageControllers } from './message.controllers';

const router = express.Router();

// Get conversations
router.get('/conversations/:cognitoId', auth(['tenant', 'manager']), MessageControllers.getConversations);

// Get messages with a specific user
router.get('/:cognitoId/:partnerId', auth(['tenant', 'manager']), MessageControllers.getMessages);

// Send message
router.post('/', auth(['tenant', 'manager']), validate(createMessageSchema), MessageControllers.sendMessage);

export const MessageRoutes = router;
