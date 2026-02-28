/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { toLeaseDTO, toPaymentDTO } from '../../../../lib/dto';
import { notifyApplicationStatusChange, notifyNewApplication } from '../../../../lib/notifications';
import { sendBadRequest, sendError, sendNotFound, sendSuccess } from '../../../../lib/response';

const prisma = new PrismaClient();

const listApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userType } = req.query;

    let whereClause = {};

    if (userId && userType) {
      if (userType === 'tenant') {
        whereClause = { tenantCognitoId: String(userId) };
      } else if (userType === 'manager') {
        whereClause = {
          property: {
            managerCognitoId: String(userId),
          },
        };
      }
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        property: {
          include: {
            location: true,
            manager: true,
          },
        },
        tenant: true,
      },
    });

    function calculateNextPaymentDate(startDate: Date): Date {
      const today = new Date();
      const nextPaymentDate = new Date(startDate);
      while (nextPaymentDate <= today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }

      return nextPaymentDate;
    }

    const formattedApplications = await Promise.all(
      applications.map(async (app) => {
        const lease = await prisma.lease.findFirst({
          where: {
            tenant: {
              cognitoId: app.tenantCognitoId,
            },
            propertyId: app.propertyId,
          },
          orderBy: { startDate: 'desc' },
        });

        return {
          ...app,
          property: {
            ...app.property,
            address: app.property.location.address,
          },
          manager: app.property.manager,
          lease: lease
            ? {
                ...lease,
                nextPaymentDate: calculateNextPaymentDate(lease.startDate),
              }
            : null,
        };
      })
    );

    // Transform to DTOs - includes necessary fields for display
    const formattedApplicationsDTO = formattedApplications.map((app) => ({
      id: app.id,
      applicationDate: app.applicationDate,
      status: app.status,
      name: app.name,
      email: app.email,
      phoneNumber: app.phoneNumber,
      message: app.message,
      propertyId: app.propertyId,
      tenantCognitoId: app.tenantCognitoId,
      property: app.property
        ? {
            id: app.property.id,
            name: app.property.name,
            address: app.property.address,
            pricePerMonth: app.property.pricePerMonth,
            photoUrls: app.property.photoUrls,
            location: app.property.location
              ? {
                  address: app.property.location.address,
                  city: app.property.location.city,
                  state: app.property.location.state,
                  country: app.property.location.country,
                }
              : null,
            managerCognitoId: app.property.managerCognitoId,
          }
        : null,
      manager: app.manager
        ? {
            id: app.manager.id,
            name: app.manager.name,
            email: app.manager.email,
            phoneNumber: app.manager.phoneNumber,
            cognitoId: app.manager.cognitoId,
          }
        : null,
      tenant: app.tenant
        ? {
            id: app.tenant.id,
            cognitoId: app.tenant.cognitoId,
            name: app.tenant.name,
            email: app.tenant.email,
            phoneNumber: app.tenant.phoneNumber,
          }
        : null,
      lease: app.lease
        ? {
            id: app.lease.id,
            startDate: app.lease.startDate,
            endDate: app.lease.endDate,
            rent: app.lease.rent,
            nextPaymentDate: app.lease.nextPaymentDate,
          }
        : null,
    }));

    // Authentication is auto-detected from res.locals - no sanitization for authenticated users
    sendSuccess(res, formattedApplicationsDTO, 'Applications retrieved successfully');
  } catch (error: any) {
    console.error('List applications error:', error);
    sendError(res, 'Error retrieving applications', 500, error);
  }
};

const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      applicationDate,
      status,
      propertyId,
      tenantCognitoId,
      name,
      email,
      phoneNumber,
      message,
    } = req.body;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { pricePerMonth: true, securityDeposit: true, applicationFee: true },
    });

    if (!property) {
      sendNotFound(res, 'Property');
      return;
    }

    // Check if tenant already has a pending or approved application for this property
    const existingApplication = await prisma.application.findFirst({
      where: {
        propertyId,
        tenantCognitoId,
        status: { in: ['Pending', 'Approved'] },
      },
    });

    if (existingApplication) {
      sendBadRequest(res, 'You already have an active application for this property');
      return;
    }

    // Just create the application - no lease yet
    // Lease will be created after manager approval AND initial payment
    const newApplication = await prisma.application.create({
      data: {
        applicationDate: new Date(applicationDate),
        status: status || 'Pending',
        name,
        email,
        phoneNumber,
        message,
        property: {
          connect: { id: propertyId },
        },
        tenant: {
          connect: { cognitoId: tenantCognitoId },
        },
      },
      include: {
        property: {
          include: {
            manager: true,
          },
        },
        tenant: true,
      },
    });

    // Notify manager of new application
    await notifyNewApplication(
      newApplication.property.managerCognitoId,
      newApplication.tenant.name,
      newApplication.property.name,
      newApplication.id
    );

    // Return sanitized response
    const responseDTO = {
      id: newApplication.id,
      applicationDate: newApplication.applicationDate,
      status: newApplication.status,
      name: newApplication.name,
      message: newApplication.message,
      propertyId: newApplication.propertyId,
    };

    sendSuccess(res, responseDTO, 'Application created successfully', 201);
  } catch (error: any) {
    console.error('Application creation error:', error);
    sendError(res, 'Error creating application', 500, error);
  }
};

const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!application) {
      sendNotFound(res, 'Application');
      return;
    }

    // Manager approves -> Set to AwaitingPayment (tenant must pay initial costs)
    if (status === 'Approved') {
      // Instead of creating lease immediately, set status to AwaitingPayment
      // Lease will be created after tenant completes initial payment
      await prisma.application.update({
        where: { id: Number(id) },
        data: { status: 'AwaitingPayment' },
      });

      // Notify tenant that application is approved and awaiting payment
      await notifyApplicationStatusChange(
        application.tenantCognitoId,
        application.property.name,
        'Approved - Awaiting Payment',
        application.id
      );
    } else {
      // Update the application status (for "Denied" and other statuses)
      await prisma.application.update({
        where: { id: Number(id) },
        data: { status },
      });

      // Notify tenant of status change
      await notifyApplicationStatusChange(
        application.tenantCognitoId,
        application.property.name,
        status,
        application.id
      );
    }

    // Respond with the updated application details
    const updatedApplication = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        property: true,
        tenant: true,
        lease: true,
      },
    });

    // Respond with sanitized updated application
    const responseDTO = updatedApplication
      ? {
          id: updatedApplication.id,
          applicationDate: updatedApplication.applicationDate,
          status: updatedApplication.status,
          name: updatedApplication.name,
          propertyId: updatedApplication.propertyId,
          lease: updatedApplication.lease ? toLeaseDTO(updatedApplication.lease) : null,
        }
      : null;

    sendSuccess(res, responseDTO, 'Application status updated successfully');
  } catch (error: any) {
    console.error('Update application error:', error);
    sendError(res, 'Error updating application status', 500, error);
  }
};

// Get initial payment breakdown for an approved application
const getInitialPaymentDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        property: true,
        payments: true,
      },
    });

    if (!application) {
      sendNotFound(res, 'Application');
      return;
    }

    if ((application.status as string) !== 'AwaitingPayment') {
      sendBadRequest(res, 'Application is not awaiting payment');
      return;
    }

    // Calculate initial costs
    const securityDeposit = application.property.securityDeposit;
    const firstMonthRent = application.property.pricePerMonth;
    const applicationFee = application.property.applicationFee || 0;
    const totalInitialPayment = securityDeposit + firstMonthRent + applicationFee;

    // Check if initial payment has already been made
    const existingPayment = application.payments.find(
      (p) => p.paymentType === 'InitialPayment' && p.paymentStatus === 'Paid'
    );

    sendSuccess(
      res,
      {
        applicationId: application.id,
        propertyId: application.propertyId,
        propertyName: application.property.name,
        breakdown: {
          securityDeposit,
          firstMonthRent,
          applicationFee,
          total: totalInitialPayment,
        },
        isPaid: !!existingPayment,
        paymentId: existingPayment?.id || null,
      },
      'Payment details retrieved successfully'
    );
  } catch (error: any) {
    console.error('Get initial payment details error:', error);
    sendError(res, 'Error getting payment details', 500, error);
  }
};

// Complete initial payment and create lease (called after Stripe payment succeeds)
const completeInitialPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { stripePaymentId, startDate } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!application) {
      sendNotFound(res, 'Application');
      return;
    }

    if ((application.status as string) !== 'AwaitingPayment') {
      sendBadRequest(res, 'Application is not awaiting payment');
      return;
    }

    const leaseStartDate = startDate ? new Date(startDate) : new Date();
    const leaseEndDate = new Date(leaseStartDate);
    leaseEndDate.setFullYear(leaseEndDate.getFullYear() + 1);

    // Calculate total initial payment
    const securityDeposit = application.property.securityDeposit;
    const firstMonthRent = application.property.pricePerMonth;
    const applicationFee = application.property.applicationFee || 0;
    const totalInitialPayment = securityDeposit + firstMonthRent + applicationFee;

    // Create lease and record payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the lease
      const newLease = await tx.lease.create({
        data: {
          startDate: leaseStartDate,
          endDate: leaseEndDate,
          rent: application.property.pricePerMonth,
          deposit: application.property.securityDeposit,
          propertyId: application.propertyId,
          tenantCognitoId: application.tenantCognitoId,
        },
      });

      // Record the initial payment
      const payment = await tx.payment.create({
        data: {
          amountDue: totalInitialPayment,
          amountPaid: totalInitialPayment,
          dueDate: new Date(),
          paymentDate: new Date(),
          paymentStatus: 'Paid',
          paymentType: 'InitialPayment',
          applicationId: application.id,
          leaseId: newLease.id,
          stripePaymentId: stripePaymentId || null,
          description: `Initial payment: Security deposit ($${securityDeposit}) + First month rent ($${firstMonthRent}) + Application fee ($${applicationFee})`,
        },
      });

      // Update application status to Approved and link lease
      const updatedApplication = await tx.application.update({
        where: { id: Number(id) },
        data: {
          status: 'Approved',
          leaseId: newLease.id,
        },
        include: {
          property: true,
          tenant: true,
          lease: true,
        },
      });

      // Connect tenant to property
      await tx.property.update({
        where: { id: application.propertyId },
        data: {
          tenants: {
            connect: { cognitoId: application.tenantCognitoId },
          },
        },
      });

      // Generate monthly payment schedule (starting from month 2)
      const monthlyPayments = [];
      for (let i = 1; i <= 11; i++) {
        const dueDate = new Date(leaseStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        dueDate.setDate(1); // Due on 1st of each month

        monthlyPayments.push({
          amountDue: application.property.pricePerMonth,
          amountPaid: 0,
          dueDate,
          paymentStatus: 'Pending' as const,
          paymentType: 'MonthlyRent' as const,
          leaseId: newLease.id,
          gracePeriodDays: 5,
          description: `Monthly rent - ${dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        });
      }

      await tx.payment.createMany({
        data: monthlyPayments,
      });

      return { updatedApplication, newLease, payment };
    });

    // Transform to DTOs for response
    const responseDTO = {
      message: 'Initial payment completed successfully. Lease created.',
      application: {
        id: result.updatedApplication.id,
        status: result.updatedApplication.status,
        propertyId: result.updatedApplication.propertyId,
      },
      lease: toLeaseDTO(result.newLease),
      payment: toPaymentDTO(result.payment),
    };

    sendSuccess(res, responseDTO, 'Initial payment completed successfully');
  } catch (error: any) {
    console.error('Complete initial payment error:', error);
    sendError(res, 'Error completing payment', 500, error);
  }
};

export const ApplicationControllers = {
  listApplications,
  createApplication,
  updateApplicationStatus,
  getInitialPaymentDetails,
  completeInitialPayment,
};
