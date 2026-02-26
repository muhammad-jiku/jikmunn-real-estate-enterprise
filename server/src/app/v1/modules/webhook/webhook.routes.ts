import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';
import { Webhook } from 'svix';

const router = express.Router();
const prisma = new PrismaClient();

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    username?: string;
    first_name?: string;
    last_name?: string;
    public_metadata?: {
      role?: string;
    };
    unsafe_metadata?: {
      role?: string;
    };
  };
}

/**
 * Clerk webhook handler for user events
 * Handles user.created and user.updated events
 */
router.post(
  '/clerk',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error('CLERK_WEBHOOK_SECRET is not configured');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    // Get the Svix headers for verification
    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing svix headers');
      res.status(400).json({ error: 'Missing svix headers' });
      return;
    }

    // Verify the webhook signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: ClerkWebhookEvent;

    try {
      evt = wh.verify(req.body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      res.status(400).json({ error: 'Verification failed' });
      return;
    }

    const eventType = evt.type;
    console.info(`[Webhook] Received event: ${eventType}`);

    if (eventType === 'user.created') {
      const { id, email_addresses, username, first_name, unsafe_metadata } = evt.data;
      const role = unsafe_metadata?.role as string | undefined;
      const email = email_addresses?.[0]?.email_address || '';
      const name = username || first_name || 'User';

      // Don't create user if role is not explicitly set
      // User will be created after they select a role on the select-role page
      if (!role) {
        console.info(`[Webhook] Skipping user creation - no role set yet for user ${id}`);
        res.status(200).json({ received: true, message: 'Role not set, skipping creation' });
        return;
      }

      console.info(`[Webhook] Creating user in database:`, {
        id,
        role,
        email,
        name,
      });

      try {
        if (role.toLowerCase() === 'manager') {
          // Check if manager already exists
          const existingManager = await prisma.manager.findUnique({
            where: { cognitoId: id },
          });

          if (!existingManager) {
            await prisma.manager.create({
              data: {
                cognitoId: id, // Using same field name for compatibility
                name,
                email,
                phoneNumber: '',
              },
            });
            console.info(`[Webhook] Manager ${id} created successfully`);
          } else {
            console.info(`[Webhook] Manager ${id} already exists`);
          }
        } else {
          // Check if tenant already exists
          const existingTenant = await prisma.tenant.findUnique({
            where: { cognitoId: id },
          });

          if (!existingTenant) {
            await prisma.tenant.create({
              data: {
                cognitoId: id,
                name,
                email,
                phoneNumber: '',
              },
            });
            console.info(`[Webhook] Tenant ${id} created successfully`);
          } else {
            console.info(`[Webhook] Tenant ${id} already exists`);
          }
        }
      } catch (error) {
        console.error('[Webhook] Error creating user:', error);
        // Don't fail the webhook - user can be created on first API call
      }
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, username, first_name, unsafe_metadata } = evt.data;
      const role = unsafe_metadata?.role as string | undefined;
      const email = email_addresses?.[0]?.email_address || '';
      const name = username || first_name || 'User';

      // Skip if no role set
      if (!role) {
        console.info(`[Webhook] Skipping user update - no role set for user ${id}`);
        res.status(200).json({ received: true, message: 'Role not set, skipping update' });
        return;
      }

      console.info(`[Webhook] Updating user in database:`, { id, role });

      try {
        // Create/update in the correct table based on role
        // AND clean up any record from the wrong table (handles role switches)
        if (role.toLowerCase() === 'manager') {
          // Upsert manager record
          await prisma.manager.upsert({
            where: { cognitoId: id },
            update: { name, email },
            create: {
              cognitoId: id,
              name,
              email,
              phoneNumber: '',
            },
          });
          // Clean up any tenant record for this user (in case they were incorrectly added)
          await prisma.tenant.deleteMany({
            where: { cognitoId: id },
          });
          console.info(`[Webhook] Manager ${id} upserted, cleaned up any tenant record`);
        } else {
          // Upsert tenant record
          await prisma.tenant.upsert({
            where: { cognitoId: id },
            update: { name, email },
            create: {
              cognitoId: id,
              name,
              email,
              phoneNumber: '',
            },
          });
          // Clean up any manager record for this user (in case they were incorrectly added)
          await prisma.manager.deleteMany({
            where: { cognitoId: id },
          });
          console.info(`[Webhook] Tenant ${id} upserted, cleaned up any manager record`);
        }
        console.info(`[Webhook] User ${id} updated successfully`);
      } catch (error) {
        console.error('[Webhook] Error updating user:', error);
      }
    }

    res.status(200).json({ received: true });
  }
);

export const WebhookRoutes = router;
