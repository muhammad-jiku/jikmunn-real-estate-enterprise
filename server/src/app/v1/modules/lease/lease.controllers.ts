/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { toLeaseDTO, toPaymentDTO, toPropertyListDTO } from '../../../../lib/dto';
import { sendError, sendSuccess } from '../../../../lib/response';

const prisma = new PrismaClient();

const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        tenant: {
          select: { id: true, name: true },
        },
        property: {
          include: { location: true },
        },
      },
    });

    // Transform to DTOs
    const leasesDTO = leases.map((lease) => ({
      ...toLeaseDTO(lease),
      tenant: { id: lease.tenant.id, name: lease.tenant.name },

      property: toPropertyListDTO(lease.property as any),
    }));

    sendSuccess(res, leasesDTO, 'Leases retrieved successfully');
  } catch (error: any) {
    console.error('Leases error:', error);
    sendError(res, 'Error retrieving leases', 500, error);
  }
};

const getLeasePayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payments = await prisma.payment.findMany({
      where: { leaseId: Number(id) },
    });

    // Transform to DTOs - removes stripe internal IDs
    const paymentsDTO = payments.map(toPaymentDTO);

    sendSuccess(res, paymentsDTO, 'Lease payments retrieved successfully');
  } catch (error: any) {
    console.error('Lease payments error:', error);
    sendError(res, 'Error retrieving lease payments', 500, error);
  }
};

export const LeaseControllers = {
  getLeases,
  getLeasePayments,
};
