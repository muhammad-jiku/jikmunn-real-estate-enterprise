/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Header from '@/components/shared/Header';
import Loading from '@/components/shared/Loading';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useGetPaymentsQuery,
    useGetPropertyLeasesQuery,
    useGetPropertyQuery,
} from '@/state/api';
import type { Lease, Payment, Property } from '@/types/prismaTypes';
import { ArrowDownToLine, ArrowLeft, Check, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

// Download utility function
const generateAndDownloadFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}`);
};

const LeaseRow: React.FC<{ lease: Lease; property: Property | undefined }> = ({ lease, property }) => {
  // fetch payments for this lease (Option A)
  const { data: payments = [], isLoading: paymentsLoading } =
    useGetPaymentsQuery(lease.id);

  const getCurrentMonthPaymentStatus = () => {
    if (paymentsLoading) return 'Loading...';

    const currentDate = new Date();
    const currentMonthPayment = payments.find((p: Payment) => {
      const due = new Date(p.dueDate);
      return (
        p.leaseId === lease.id &&
        due.getMonth() === currentDate.getMonth() &&
        due.getFullYear() === currentDate.getFullYear()
      );
    });

    return currentMonthPayment?.paymentStatus || 'Not Paid';
  };

  const currentStatus = getCurrentMonthPaymentStatus();
  const isPaid = currentStatus === 'Paid';

  const handleDownloadAgreement = () => {
    const tenant = (lease as any).tenant;
    const content = `
LEASE AGREEMENT
===============

Property: ${property?.name || 'N/A'}
Address: ${(property as any)?.location?.address || 'N/A'}, ${(property as any)?.location?.city || ''}, ${(property as any)?.location?.state || ''}

Tenant: ${tenant?.name || 'N/A'}
Email: ${tenant?.email || 'N/A'}
Phone: ${tenant?.phoneNumber || 'N/A'}

Lease Details:
- Lease ID: ${lease.id}
- Start Date: ${new Date(lease.startDate).toLocaleDateString()}
- End Date: ${new Date(lease.endDate).toLocaleDateString()}
- Monthly Rent: $${Number(lease.rent).toFixed(2)}
- Security Deposit: $${property?.securityDeposit || 'N/A'}

Terms and Conditions:
1. The tenant agrees to pay rent on the first of each month.
2. The tenant shall maintain the property in good condition.
3. No unauthorized modifications to the property are permitted.
4. The security deposit will be returned upon satisfactory inspection at lease end.

Signed electronically via RENTIFUL platform.
    `;
    generateAndDownloadFile(`lease-${lease.id}-${tenant?.name?.replace(/\s+/g, '-') || 'tenant'}.txt`, content);
  };

  return (
    <TableRow key={lease.id} className='h-24'>
      <TableCell>
        <div className='flex items-center space-x-3'>
          <Image
            src={
              // prefer tenant photo if available, otherwise fallback to S3 image used previously
              (lease as any).tenant?.photoUrl ||
              'https://jikmunn-real-estate-enterprise-s3-images.s3.ap-southeast-1.amazonaws.com/landing-i1.png'
            }
            width={40}
            height={40}
            className='rounded-full'
            alt={(lease as any).tenant?.name || 'Tenant'}
            onError={(e) => {
              // fallback image when next/image fails to load
              (e.currentTarget as HTMLImageElement).src = '/landing-i1.png';
            }}
          />
          <div>
            <div className='font-semibold'>{(lease as any).tenant?.name}</div>
            <div className='text-sm text-gray-500'>
              {(lease as any).tenant?.email}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div>{new Date(lease.startDate).toLocaleDateString()} -</div>
        <div>{new Date(lease.endDate).toLocaleDateString()}</div>
      </TableCell>

      <TableCell>${Number(lease.rent).toFixed(2)}</TableCell>

      <TableCell>
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            isPaid
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-red-100 text-red-800 border-red-300'
          }`}
        >
          {isPaid && <Check className='w-4 h-4 inline-block mr-1' />}
          {currentStatus}
        </span>
      </TableCell>

      <TableCell>{(lease as any).tenant?.phoneNumber}</TableCell>

      <TableCell>
        <button
          onClick={handleDownloadAgreement}
          className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex 
            items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50`}
        >
          <ArrowDownToLine className='w-4 h-4 mr-1' />
          Download Agreement
        </button>
      </TableCell>
    </TableRow>
  );
};

const PropertyTenants = () => {
  const { id } = useParams();
  const propertyId = Number(id);

  const { data: property, isLoading: propertyLoading } =
    useGetPropertyQuery(propertyId);

  const { data: leases, isLoading: leasesLoading } =
    useGetPropertyLeasesQuery(propertyId);

  const handleDownloadAll = () => {
    if (!leases || leases.length === 0) {
      toast.info('No leases to download');
      return;
    }

    const content = leases.map((lease) => {
      const tenant = lease.tenant as any;
      return `
TENANT: ${tenant?.name || 'N/A'}
Email: ${tenant?.email || 'N/A'}
Phone: ${tenant?.phoneNumber || 'N/A'}
Lease Period: ${new Date(lease.startDate).toLocaleDateString()} - ${new Date(lease.endDate).toLocaleDateString()}
Monthly Rent: $${Number(lease.rent).toFixed(2)}
---`;
    }).join('\n');

    generateAndDownloadFile(
      `${property?.name?.replace(/\s+/g, '-') || 'property'}-all-tenants.txt`,
      `TENANTS OVERVIEW\n================\nProperty: ${property?.name || 'N/A'}\nAddress: ${property?.location?.address || 'N/A'}, ${property?.location?.city || ''}\n\n${content}`
    );
  };

  if (propertyLoading || leasesLoading) return <Loading />;

  return (
    <div className='dashboard-container'>
      {/* Back to properties page */}
      <Link
        href='/managers/properties'
        className='flex items-center mb-4 hover:text-primary-500'
        scroll={false}
      >
        <ArrowLeft className='w-4 h-4 mr-2' />
        <span>Back to Properties</span>
      </Link>

      <Header
        title={property?.name || 'My Property'}
        subtitle='Manage tenants and leases for this property'
      />

      <div className='w-full space-y-6'>
        <div className='mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6'>
          <div className='flex justify-between items-center mb-4'>
            <div>
              <h2 className='text-2xl font-bold mb-1'>Tenants Overview</h2>
              <p className='text-sm text-gray-500'>
                Manage and view all tenants for this property.
              </p>
            </div>
            <div>
              <button
                onClick={handleDownloadAll}
                disabled={!leases || leases.length === 0}
                className={`bg-white border border-gray-300 text-gray-700 py-2
                  px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Download className='w-5 h-5 mr-2' />
                <span>Download All</span>
              </button>
            </div>
          </div>

          <hr className='mt-4 mb-1' />

          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Lease Period</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Current Month Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {leases?.map((lease) => (
                  <LeaseRow key={lease.id} lease={lease} property={property} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyTenants;
