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
import type { Lease, Payment } from '@/types/prismaTypes';
import { ArrowDownToLine, ArrowLeft, Check, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react';

const LeaseRow: React.FC<{ lease: Lease }> = ({ lease }) => {
  // fetch payments for this lease (Option A)
  const { data: payments = [], isLoading: paymentsLoading } =
    useGetPaymentsQuery(lease.id);
  console.log(
    'Payments for lease id in properties id page',
    lease.id,
    ':',
    payments
  );

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

  return (
    <TableRow key={lease.id} className='h-24'>
      <TableCell>
        <div className='flex items-center space-x-3'>
          <Image
            src={
              // prefer tenant photo if available, otherwise fallback to S3 image used previously
              (lease.tenant as any)?.photoUrl ||
              'https://jikmunn-real-estate-enterprise-s3-images.s3.ap-southeast-1.amazonaws.com/landing-i1.png'
            }
            width={40}
            height={40}
            className='rounded-full'
            alt={(lease.tenant as any)?.name || 'Tenant'}
            onError={(e) => {
              // fallback image when next/image fails to load
              (e.currentTarget as HTMLImageElement).src = '/landing-i1.png';
            }}
          />
          <div>
            <div className='font-semibold'>{(lease.tenant as any)?.name}</div>
            <div className='text-sm text-gray-500'>
              {(lease.tenant as any)?.email}
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

      <TableCell>{(lease.tenant as any)?.phoneNumber}</TableCell>

      <TableCell>
        <button
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
  console.log('Property id from useParams:', id, ', as number:', propertyId);

  const { data: property, isLoading: propertyLoading } =
    useGetPropertyQuery(propertyId);
  console.log('property data in properties id page:', property);

  const { data: leases, isLoading: leasesLoading } =
    useGetPropertyLeasesQuery(propertyId);
  console.log('leases data in properties id page:', leases);

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
                className={`bg-white border border-gray-300 text-gray-700 py-2
                  px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50`}
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
                  <LeaseRow key={lease.id} lease={lease} />
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
