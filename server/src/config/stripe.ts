import Stripe from 'stripe';
import { config } from './index.config';

if (!config.stripe.secretKey) {
  console.warn('Warning: STRIPE_SECRET_KEY not set. Payment functionality will not work.');
}

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

// Webhook secret is optional - only needed if you set up webhooks in Stripe Dashboard
export const STRIPE_WEBHOOK_SECRET = config.stripe.webhookSecret;

if (!STRIPE_WEBHOOK_SECRET) {
  console.info('Info: STRIPE_WEBHOOK_SECRET not set. Webhook endpoint will be disabled. You can add it later from Stripe Dashboard > Developers > Webhooks.');
}

// Helper functions
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> => {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
};

export const createCustomer = async (
  email: string,
  name: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Customer> => {
  return stripe.customers.create({
    email,
    name,
    metadata,
  });
};

export const getCustomer = async (customerId: string): Promise<Stripe.Customer | null> => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer as Stripe.Customer;
  } catch {
    return null;
  }
};

export const createInvoice = async (
  customerId: string,
  items: { description: string; amount: number }[]
): Promise<Stripe.Invoice> => {
  // Create invoice items
  for (const item of items) {
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(item.amount * 100),
      description: item.description,
      currency: 'usd',
    });
  }

  // Create and finalize invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
  });

  return stripe.invoices.finalizeInvoice(invoice.id);
};

export const createBillingPortalSession = async (
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> => {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

export const findOrCreateCustomer = async (
  email: string,
  name: string,
  cognitoId: string
): Promise<Stripe.Customer> => {
  // Try to find existing customer by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name,
    metadata: {
      cognitoId,
    },
  });
};
