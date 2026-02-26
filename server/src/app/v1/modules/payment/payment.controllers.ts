import { PaymentStatus, PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { config } from '../../../../config/index.config';
import {
  createPaymentIntent,
  createBillingPortalSession as createPortalSession,
  findOrCreateCustomer,
  stripe,
  STRIPE_WEBHOOK_SECRET,
} from '../../../../config/stripe';
import { AuditActions, AuditEntities, createAuditLog } from '../../../../lib/auditLog';
import { toPaymentDTO } from '../../../../lib/dto';
import { notifyPaymentReceived } from '../../../../lib/notifications';
import { sendSuccess } from '../../../../lib/response';
import {
  asyncHandler,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../middleware/errorHandler';

const prisma = new PrismaClient();

// Create payment intent for initial payment (before lease exists)
const createInitialPaymentIntent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { applicationId } = req.body;
    const userId = req.user?.id;

    // Verify application exists and belongs to tenant
    const application = await prisma.application.findUnique({
      where: { id: Number(applicationId) },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.tenantCognitoId !== userId) {
      throw new ForbiddenError('Not authorized for this application');
    }

    // Check if application is awaiting payment (after manager approval)
    if ((application.status as string) !== 'AwaitingPayment') {
      throw new BadRequestError('Application is not awaiting payment');
    }

    // Calculate total initial payment
    const securityDeposit = application.property.securityDeposit;
    const firstMonthRent = application.property.pricePerMonth;
    const applicationFee = application.property.applicationFee || 0;
    const totalAmount = securityDeposit + firstMonthRent + applicationFee;

    // Create Stripe payment intent
    const paymentIntent = await createPaymentIntent(totalAmount, 'usd', {
      applicationId: String(applicationId),
      tenantId: userId || '',
      propertyId: String(application.propertyId),
      paymentType: 'initial_payment',
      securityDeposit: String(securityDeposit),
      firstMonthRent: String(firstMonthRent),
      applicationFee: String(applicationFee),
    });

    sendSuccess(
      res,
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        breakdown: {
          securityDeposit,
          firstMonthRent,
          applicationFee,
          total: totalAmount,
        },
      },
      'Payment intent created successfully'
    );
  }
);

// Create payment intent for monthly rent or lease payment
const createIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { leaseId, amount, paymentType } = req.body;
  const userId = req.user?.id;

  // Verify lease exists and belongs to tenant
  const lease = await prisma.lease.findUnique({
    where: { id: Number(leaseId) },
    include: {
      tenant: true,
      property: true,
    },
  });

  if (!lease) {
    throw new NotFoundError('Lease not found');
  }

  if (lease.tenantCognitoId !== userId) {
    throw new ForbiddenError('Not authorized for this lease');
  }

  // Create Stripe payment intent
  const paymentIntent = await createPaymentIntent(amount, 'usd', {
    leaseId: String(leaseId),
    tenantId: userId || '',
    propertyId: String(lease.propertyId),
    paymentType: paymentType || 'rent',
  });

  sendSuccess(
    res,
    {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    },
    'Payment intent created successfully'
  );
});

// Handle Stripe webhook
const handleWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Check if webhook secret is configured
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET not configured. Webhook endpoint disabled.');
    res.status(503).json({ message: 'Webhook not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new BadRequestError(`Webhook signature verification failed: ${err}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { leaseId, tenantId, paymentType } = paymentIntent.metadata;

      // Find or create payment record
      const existingPayment = await prisma.payment.findFirst({
        where: {
          leaseId: Number(leaseId),
          paymentStatus: 'Pending',
        },
        orderBy: { dueDate: 'asc' },
      });

      if (existingPayment) {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            amountPaid: paymentIntent.amount / 100,
            paymentStatus: PaymentStatus.Paid,
            paymentDate: new Date(),
            stripePaymentId: paymentIntent.id,
            receiptUrl: null, // Receipt URL can be fetched from charge later if needed
          },
        });
      } else {
        // Create new payment record
        const lease = await prisma.lease.findUnique({
          where: { id: Number(leaseId) },
        });

        if (lease) {
          await prisma.payment.create({
            data: {
              leaseId: Number(leaseId),
              amountDue: paymentIntent.amount / 100,
              amountPaid: paymentIntent.amount / 100,
              dueDate: new Date(),
              paymentDate: new Date(),
              paymentStatus: PaymentStatus.Paid,
              stripePaymentId: paymentIntent.id,
              receiptUrl: null, // Receipt URL can be fetched from charge later if needed
            },
          });
        }
      }

      // Notify manager
      const lease = await prisma.lease.findUnique({
        where: { id: Number(leaseId) },
        include: {
          property: { include: { manager: true } },
          tenant: true,
        },
      });

      if (lease) {
        await notifyPaymentReceived(
          lease.property.managerCognitoId,
          lease.tenant.name,
          lease.property.name,
          paymentIntent.amount / 100,
          existingPayment?.id || 0
        );

        // Audit log
        await createAuditLog({
          action: AuditActions.PAYMENT,
          entity: AuditEntities.PAYMENT,
          entityId: existingPayment?.id,
          userId: tenantId,
          userRole: 'tenant',
          newData: { amount: paymentIntent.amount / 100, paymentType },
        });
      }

      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error('Payment failed:', paymentIntent.id);
      break;
    }
  }

  res.status(200).json({ received: true });
});

// Get payment history for a lease
const getLeasePayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { leaseId } = req.params;

  const payments = await prisma.payment.findMany({
    where: { leaseId: Number(leaseId) },
    orderBy: { dueDate: 'desc' },
  });

  // Transform to DTOs - removes stripe internal IDs
  const paymentsDTO = payments.map(toPaymentDTO);

  sendSuccess(res, paymentsDTO, 'Lease payments retrieved successfully');
});

// Get payment history for tenant
const getTenantPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cognitoId = req.params.cognitoId as string;

  const payments = await prisma.payment.findMany({
    where: {
      lease: { tenantCognitoId: cognitoId },
    },
    include: {
      lease: {
        include: {
          property: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { dueDate: 'desc' },
  });

  // Transform to DTOs
  const paymentsDTO = payments.map((payment) => ({
    ...toPaymentDTO(payment),
    property: payment.lease?.property
      ? {
          id: payment.lease.property.id,
          name: payment.lease.property.name,
        }
      : null,
    leaseId: payment.leaseId,
  }));

  sendSuccess(res, paymentsDTO, 'Tenant payments retrieved successfully');
});

// Get payments for manager's properties
const getManagerPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  const { status, propertyId } = req.query;

  const whereConditions: Record<string, unknown> = {
    lease: {
      property: { managerCognitoId: cognitoId },
    },
  };

  if (status && status !== 'all') {
    whereConditions.paymentStatus = status as PaymentStatus;
  }

  if (propertyId) {
    whereConditions.lease = {
      ...(whereConditions.lease as object),
      propertyId: Number(propertyId),
    };
  }

  const payments = await prisma.payment.findMany({
    where: whereConditions,
    include: {
      lease: {
        include: {
          property: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { dueDate: 'desc' },
  });

  // Transform to DTOs
  const paymentsDTO = payments.map((payment) => ({
    ...toPaymentDTO(payment),
    property: payment.lease?.property
      ? {
          id: payment.lease.property.id,
          name: payment.lease.property.name,
        }
      : null,
    tenant: payment.lease?.tenant
      ? {
          id: payment.lease.tenant.id,
          name: payment.lease.tenant.name,
          email: payment.lease.tenant.email,
        }
      : null,
    leaseId: payment.leaseId,
  }));

  sendSuccess(res, paymentsDTO, 'Manager payments retrieved successfully');
});

// Create manual payment (manager entering offline payment)
const createManualPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { leaseId, amountPaid, paymentDate, notes } = req.body;
  const userId = req.user?.id;

  // Verify manager owns the property
  const lease = await prisma.lease.findUnique({
    where: { id: Number(leaseId) },
    include: { property: true },
  });

  if (!lease || lease.property.managerCognitoId !== userId) {
    throw new ForbiddenError('Not authorized for this lease');
  }

  // Find pending payment or create new one
  const pendingPayment = await prisma.payment.findFirst({
    where: {
      leaseId: Number(leaseId),
      paymentStatus: 'Pending',
    },
    orderBy: { dueDate: 'asc' },
  });

  let payment;
  if (pendingPayment) {
    const newAmountPaid = pendingPayment.amountPaid + amountPaid;
    const newStatus =
      newAmountPaid >= pendingPayment.amountDue ? PaymentStatus.Paid : PaymentStatus.PartiallyPaid;

    payment = await prisma.payment.update({
      where: { id: pendingPayment.id },
      data: {
        amountPaid: newAmountPaid,
        paymentStatus: newStatus,
        paymentDate: new Date(paymentDate),
      },
    });
  } else {
    payment = await prisma.payment.create({
      data: {
        leaseId: Number(leaseId),
        amountDue: lease.rent,
        amountPaid,
        dueDate: new Date(),
        paymentDate: new Date(paymentDate),
        paymentStatus: amountPaid >= lease.rent ? PaymentStatus.Paid : PaymentStatus.PartiallyPaid,
      },
    });
  }

  // Audit log
  await createAuditLog({
    action: AuditActions.CREATE,
    entity: AuditEntities.PAYMENT,
    entityId: payment.id,
    userId: userId || '',
    userRole: 'manager',
    newData: { amountPaid, paymentDate, notes },
    req,
  });

  sendSuccess(res, toPaymentDTO(payment), 'Manual payment created successfully', 201);
});

// Create billing portal session for tenant to manage payment methods
const createBillingPortalSession = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { returnUrl } = req.body;

    if (!userId) {
      throw new ForbiddenError('Not authenticated');
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId: userId },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Find or create Stripe customer
    const customer = await findOrCreateCustomer(tenant.email, tenant.name, tenant.cognitoId);

    // Create billing portal session
    const session = await createPortalSession(
      customer.id,
      returnUrl || `${config.clientUrl}/tenants/residences`
    );

    sendSuccess(res, { url: session.url }, 'Billing portal session created');
  }
);

export const PaymentControllers = {
  createIntent,
  createInitialPaymentIntent,
  handleWebhook,
  getLeasePayments,
  getTenantPayments,
  getManagerPayments,
  createManualPayment,
  createBillingPortalSession,
};
