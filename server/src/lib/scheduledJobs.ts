import { PaymentType, PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import logger from './logger';
import { notifyLeaseExpiring, notifyPaymentDue } from './notifications';

const prisma = new PrismaClient();

// Check for upcoming payment due dates and send reminders
// Runs every day at 9:00 AM
const schedulePaymentReminders = () => {
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running payment reminder job...');
    
    try {
      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);
      
      // Find pending payments due within the next 3 days
      const upcomingPayments = await prisma.payment.findMany({
        where: {
          paymentStatus: 'Pending',
          dueDate: {
            gte: today,
            lte: threeDaysFromNow,
          },
        },
        include: {
          lease: {
            include: {
              property: true,
              tenant: true,
            },
          },
        },
      });
      
      logger.info(`Found ${upcomingPayments.length} upcoming payments to notify`);
      
      for (const payment of upcomingPayments) {
        // Check if we already sent a notification for this payment recently
        if (!payment.lease || !payment.leaseId) {
          logger.warn(`Payment ${payment.id} has no associated lease`);
          continue;
        }
        
        const existingNotification = await prisma.notification.findFirst({
          where: {
            tenantCognitoId: payment.lease.tenantCognitoId,
            type: 'PaymentDue',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
            data: {
              path: ['leaseId'],
              equals: payment.leaseId,
            },
          },
        });
        
        if (!existingNotification) {
          await notifyPaymentDue(
            payment.lease.tenantCognitoId,
            payment.lease.property.name,
            payment.amountDue,
            payment.dueDate,
            payment.leaseId
          );
          logger.info(`Sent payment reminder to tenant ${payment.lease.tenantCognitoId}`);
        }
      }
      
      logger.info('Payment reminder job completed');
    } catch (error) {
      logger.error('Error in payment reminder job:', error);
    }
  });
};

// Check for leases expiring soon and send notifications
// Runs every day at 10:00 AM
const scheduleLeaseExpirationReminders = () => {
  cron.schedule('0 10 * * *', async () => {
    logger.info('Running lease expiration reminder job...');
    
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      // Find leases expiring within the next 30 days
      const expiringLeases = await prisma.lease.findMany({
        where: {
          endDate: {
            gte: today,
            lte: thirtyDaysFromNow,
          },
        },
        include: {
          property: true,
          tenant: true,
        },
      });
      
      logger.info(`Found ${expiringLeases.length} leases expiring soon`);
      
      for (const lease of expiringLeases) {
        // Check days until expiration to determine notification frequency
        const daysUntilExpiration = Math.ceil(
          (lease.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Send notifications at 30, 14, 7, 3, and 1 day(s) before expiration
        const notificationDays = [30, 14, 7, 3, 1];
        
        if (notificationDays.includes(daysUntilExpiration)) {
          // Check if we already sent this specific notification
          const existingNotification = await prisma.notification.findFirst({
            where: {
              OR: [
                { tenantCognitoId: lease.tenantCognitoId },
                { managerCognitoId: lease.property.managerCognitoId },
              ],
              type: 'LeaseExpiring',
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
              data: {
                path: ['leaseId'],
                equals: lease.id,
              },
            },
          });
          
          if (!existingNotification) {
            await notifyLeaseExpiring(
              lease.tenantCognitoId,
              lease.property.managerCognitoId,
              lease.property.name,
              lease.endDate,
              lease.id
            );
            logger.info(`Sent lease expiration reminder for lease ${lease.id}`);
          }
        }
      }
      
      logger.info('Lease expiration reminder job completed');
    } catch (error) {
      logger.error('Error in lease expiration reminder job:', error);
    }
  });
};

// Generate monthly payment records for active leases
// Runs on the 25th of each month at midnight to create next month's payment records
const scheduleMonthlyPaymentGeneration = () => {
  cron.schedule('0 0 25 * *', async () => {
    logger.info('Running monthly payment generation job...');
    
    try {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      
      // Find active leases
      const activeLeases = await prisma.lease.findMany({
        where: {
          endDate: { gte: nextMonth },
          startDate: { lte: nextMonth },
        },
        include: {
          property: true,
        },
      });
      
      logger.info(`Found ${activeLeases.length} active leases for payment generation`);
      
      for (const lease of activeLeases) {
        // Check if payment for next month already exists
        const existingPayment = await prisma.payment.findFirst({
          where: {
            leaseId: lease.id,
            dueDate: {
              gte: nextMonth,
              lte: endOfNextMonth,
            },
          },
        });
        
        if (!existingPayment) {
          // Create payment record for next month (due on the 1st with 5 day grace period)
          const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
          
          await prisma.payment.create({
            data: {
              leaseId: lease.id,
              amountDue: lease.property.pricePerMonth,
              amountPaid: 0,
              dueDate,
              paymentStatus: 'Pending',
              paymentType: PaymentType.MonthlyRent,
              gracePeriodDays: 5,
              description: `Rent for ${nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            },
          });
          
          logger.info(`Created payment record for lease ${lease.id}`);
        }
      }
      
      logger.info('Monthly payment generation job completed');
    } catch (error) {
      logger.error('Error in monthly payment generation job:', error);
    }
  });
};

// Mark overdue payments
// Runs every day at 1:00 AM
const scheduleOverduePaymentCheck = () => {
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running overdue payment check job...');
    
    try {
      const today = new Date();
      
      // Find pending payments past their grace period
      const overduePayments = await prisma.payment.findMany({
        where: {
          paymentStatus: 'Pending',
        },
        include: {
          lease: true,
        },
      });
      
      let updatedCount = 0;
      
      for (const payment of overduePayments) {
        const gracePeriodDays = payment.gracePeriodDays || 5;
        const effectiveDueDate = new Date(payment.dueDate);
        effectiveDueDate.setDate(effectiveDueDate.getDate() + gracePeriodDays);
        
        if (today > effectiveDueDate) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { paymentStatus: 'Overdue' },
          });
          updatedCount++;
        }
      }
      
      logger.info(`Marked ${updatedCount} payments as overdue`);
    } catch (error) {
      logger.error('Error in overdue payment check job:', error);
    }
  });
};

// Initialize all scheduled jobs
export const initializeScheduledJobs = () => {
  logger.info('Initializing scheduled jobs...');
  
  schedulePaymentReminders();
  scheduleLeaseExpirationReminders();
  scheduleMonthlyPaymentGeneration();
  scheduleOverduePaymentCheck();
  
  logger.info('All scheduled jobs initialized');
};

// For manual triggering/testing
export const runPaymentRemindersNow = async () => {
  logger.info('Manually running payment reminders...');
  // ... same logic as cron job
};

export const runLeaseExpirationRemindersNow = async () => {
  logger.info('Manually running lease expiration reminders...');
  // ... same logic as cron job
};
