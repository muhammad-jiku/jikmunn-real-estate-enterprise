import { Router, raw } from 'express';
import { createManualPaymentSchema, createPaymentIntentSchema } from '../../../../lib/validators';
import { auth } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { PaymentControllers } from './payment.controllers';

const router = Router();

// Stripe webhook - needs raw body
router.post('/webhook', raw({ type: 'application/json' }), PaymentControllers.handleWebhook);

// Create payment intent for initial payment (before lease - application awaiting payment)
router.post(
  '/create-initial-intent',
  auth(['tenant']),
  PaymentControllers.createInitialPaymentIntent
);

// Create payment intent (tenant initiates payment for existing lease)
router.post(
  '/create-intent',
  auth(['tenant']),
  validate(createPaymentIntentSchema),
  PaymentControllers.createIntent
);

// Get payments for a specific lease
router.get('/lease/:leaseId', auth(['tenant', 'manager']), PaymentControllers.getLeasePayments);

// Get all payments for a tenant
router.get('/tenant/:cognitoId', auth(['tenant']), PaymentControllers.getTenantPayments);

// Get all payments for a manager's properties
router.get('/manager/:cognitoId', auth(['manager']), PaymentControllers.getManagerPayments);

// Create manual payment (manager records offline payment)
router.post(
  '/manual',
  auth(['manager']),
  validate(createManualPaymentSchema),
  PaymentControllers.createManualPayment
);

// Create billing portal session (tenant manages payment methods)
router.post('/billing-portal', auth(['tenant']), PaymentControllers.createBillingPortalSession);

export const PaymentRoutes = router;
