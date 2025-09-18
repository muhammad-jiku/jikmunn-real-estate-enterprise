import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        tenant: true,
        property: true,
      },
    });
    console.log('leases:', leases);

    res.json(leases);
  } catch (error: any) {
    console.log('leases error:', error);
    res
      .status(500)
      .json({ message: `Error retrieving leases: ${error.message}` });
  }
};

export const getLeasePayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('id:', id);

    const payments = await prisma.payment.findMany({
      where: { leaseId: Number(id) },
    });
    console.log('payments:', payments);

    res.json(payments);
  } catch (error: any) {
    console.log('lease payments error:', error);
    res
      .status(500)
      .json({ message: `Error retrieving lease payments: ${error.message}` });
  }
};
