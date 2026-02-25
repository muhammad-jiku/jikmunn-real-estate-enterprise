/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { MessageButton } from '@/components/messages/SendMessageDialog';
import Loading from '@/components/shared/Loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreateBillingPortalSessionMutation,
  useGetAuthUserQuery,
  useGetLeasesQuery,
  useGetPaymentsQuery,
  useGetPropertyQuery,
} from '@/state/api';
import { Lease, Payment, Property } from '@/types/prismaTypes';
import {
  ArrowDownToLineIcon,
  Check,
  CreditCard,
  Download,
  Edit,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

// Download utility function
const generateAndDownloadPDF = (filename: string, content: string) => {
  // Create a simple text-based download (in production, use a PDF library)
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

const PaymentMethod = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [createBillingPortalSession, { isLoading: isCreatingPortal }] =
    useCreateBillingPortalSessionMutation();

  const handleEditPayment = () => {
    setIsEditing(true);
  };

  const handleOpenPortal = async () => {
    try {
      toast.info('Redirecting to payment portal...');
      const result = await createBillingPortalSession({
        returnUrl: window.location.href,
      }).unwrap();

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (_error) {
      toast.error('Failed to open payment portal. Please try again.');
    }
    setIsEditing(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mt-10 md:mt-0 flex-1">
        <h2 className="text-2xl font-bold mb-4">Payment method</h2>
        <p className="mb-4">Change how you pay for your plan.</p>
        <div className="border rounded-lg p-6">
          <div>
            {/* Card Info */}
            <div className="flex gap-10">
              <div className="w-36 h-20 bg-blue-600 flex items-center justify-center rounded-md">
                <span className="text-white text-2xl font-bold">VISA</span>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-5">
                    <h3 className="text-lg font-semibold">Visa ending in 2024</h3>
                    <span className="text-sm font-medium border border-primary-700 text-primary-700 px-3 py-1 rounded-full">
                      Default
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <CreditCard className="w-4 h-4 mr-1" />
                    <span>Expiry • 26/06/2025</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  <span>billing@baseclub.com</span>
                </div>
              </div>
            </div>

            <hr className="my-4" />
            <div className="flex justify-end">
              <button
                onClick={handleEditPayment}
                className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50"
              >
                <Edit className="w-5 h-5 mr-2" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Payment Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">
              Payment method editing is managed through your Stripe customer portal.
            </p>
            <button
              onClick={handleOpenPortal}
              disabled={isCreatingPortal}
              className="w-full bg-primary-700 text-white py-2 px-4 rounded-md hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingPortal ? 'Opening Portal...' : 'Open Payment Portal'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ResidenceCard = ({ property, currentLease }: { property: Property; currentLease: Lease }) => {
  const [showManagerModal, setShowManagerModal] = useState(false);

  const manager = (property as any).manager;

  const handleDownloadAgreement = () => {
    const content = `
LEASE AGREEMENT
================

Property: ${property.name}
Address: ${(property as any).location?.address}, ${(property as any).location?.city}, ${(property as any).location?.state} ${(property as any).location?.postalCode}

Lease Period: ${new Date(currentLease.startDate).toLocaleDateString()} - ${new Date(currentLease.endDate).toLocaleDateString()}
Monthly Rent: $${currentLease.rent}
Security Deposit: $${property.securityDeposit || 'N/A'}

This agreement is entered into between the landlord and tenant for the rental of the above property.

Terms and Conditions:
1. The tenant agrees to pay rent on the first of each month.
2. The tenant shall maintain the property in good condition.
3. No unauthorized modifications to the property are permitted.
4. The security deposit will be returned upon satisfactory inspection at lease end.

Signed electronically via RENTIFUL platform.
    `;
    generateAndDownloadPDF(`lease-agreement-${currentLease.id}.txt`, content);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 flex-1 flex flex-col justify-between">
        {/* Header */}
        <div className="flex gap-5">
          <div className="w-64 h-32 object-cover bg-slate-500 rounded-xl"></div>

          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-green-500 w-fit text-white px-4 py-1 rounded-full text-sm font-semibold">
                Active Leases
              </div>

              <h2 className="text-2xl font-bold my-2">{property.name}</h2>
              <div className="flex items-center mb-2">
                <MapPin className="w-5 h-5 mr-1" />
                <span>
                  {(property as any).location?.city}, {(property as any).location?.country}
                </span>
              </div>
            </div>
            <div className="text-xl font-bold">
              ${currentLease.rent}{' '}
              <span className="text-gray-500 text-sm font-normal">/ month</span>
            </div>
          </div>
        </div>
        {/* Dates */}
        <div>
          <hr className="my-4" />
          <div className="flex justify-between items-center">
            <div className="xl:flex">
              <div className="text-gray-500 mr-2">Start Date: </div>
              <div className="font-semibold">
                {new Date(currentLease.startDate).toLocaleDateString()}
              </div>
            </div>
            <div className="border-[0.5px] border-primary-300 h-4" />
            <div className="xl:flex">
              <div className="text-gray-500 mr-2">End Date: </div>
              <div className="font-semibold">
                {new Date(currentLease.endDate).toLocaleDateString()}
              </div>
            </div>
            <div className="border-[0.5px] border-primary-300 h-4" />
            <div className="xl:flex">
              <div className="text-gray-500 mr-2">Next Payment: </div>
              <div className="font-semibold">
                {new Date(currentLease.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>
          <hr className="my-4" />
        </div>
        {/* Buttons */}
        <div className="flex justify-end gap-2 w-full">
          <button
            onClick={() => setShowManagerModal(true)}
            className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50"
          >
            <User className="w-5 h-5 mr-2" />
            Manager
          </button>
          {manager?.cognitoId && (
            <MessageButton
              recipientId={manager.cognitoId}
              recipientName={manager.name || 'Manager'}
              recipientType="manager"
              propertyId={property.id}
              propertyName={property.name}
              context="lease"
              variant="outline"
            />
          )}
          <button
            onClick={handleDownloadAgreement}
            className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Agreement
          </button>
        </div>
      </div>

      {/* Manager Contact Modal */}
      <Dialog open={showManagerModal} onOpenChange={setShowManagerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Property Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-8 h-8 text-primary-700" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{manager?.name || 'Property Manager'}</h3>
                <p className="text-sm text-gray-500">Property Manager</p>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <a
                  href={`mailto:${manager?.email || ''}`}
                  className="text-primary-700 hover:underline"
                >
                  {manager?.email || 'Contact not available'}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a
                  href={`tel:${manager?.phoneNumber || ''}`}
                  className="text-primary-700 hover:underline"
                >
                  {manager?.phoneNumber || 'Phone not available'}
                </a>
              </div>
            </div>
            {/* Message Manager Button */}
            {manager?.cognitoId && (
              <div className="pt-4 border-t">
                <MessageButton
                  recipientId={manager.cognitoId}
                  recipientName={manager.name || 'Manager'}
                  recipientType="manager"
                  propertyId={property.id}
                  propertyName={property.name}
                  context="lease"
                  variant="default"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const BillingHistory = ({ payments }: { payments: Payment[] }) => {
  const handleDownloadInvoice = (payment: Payment) => {
    const content = `
PAYMENT INVOICE
===============

Invoice #: ${payment.id}
Date: ${payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
Status: ${payment.paymentStatus}

Amount Paid: $${payment.amountPaid.toFixed(2)}
Due Date: ${new Date(payment.dueDate).toLocaleDateString()}

Payment Method: ${(payment as any).paymentMethod || 'Credit Card'}

Thank you for your payment!
    `;
    generateAndDownloadPDF(`invoice-${payment.id}.txt`, content);
  };

  const handleDownloadAll = () => {
    const content = payments
      .map(
        (payment) => `
Invoice #${payment.id}
Date: ${payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
Amount: $${payment.amountPaid.toFixed(2)}
Status: ${payment.paymentStatus}
---`
      )
      .join('\n');
    generateAndDownloadPDF('all-invoices.txt', `BILLING HISTORY\n==============\n${content}`);
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Billing History</h2>
          <p className="text-sm text-gray-500">
            Download your previous plan receipts and usage details.
          </p>
        </div>
        <div>
          <button
            onClick={handleDownloadAll}
            disabled={payments.length === 0}
            className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 mr-2" />
            <span>Download All</span>
          </button>
        </div>
      </div>
      <hr className="mt-4 mb-1" />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} className="h-16">
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Invoice #{payment.id} -{' '}
                    {payment.paymentDate
                      ? new Date(payment.paymentDate).toLocaleString('default', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                      payment.paymentStatus === 'Paid'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                    }`}
                  >
                    {payment.paymentStatus === 'Paid' ? (
                      <Check className="w-4 h-4 inline-block mr-1" />
                    ) : null}
                    {payment.paymentStatus}
                  </span>
                </TableCell>
                <TableCell>
                  {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>${payment.amountPaid.toFixed(2)}</TableCell>
                <TableCell>
                  <button
                    onClick={() => handleDownloadInvoice(payment)}
                    className="border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50"
                  >
                    <ArrowDownToLineIcon className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const Residence = () => {
  const { id } = useParams();
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: property,
    isLoading: propertyLoading,
    error: propertyError,
  } = useGetPropertyQuery(Number(id));

  const { data: leases, isLoading: leasesLoading } = useGetLeasesQuery(
    parseInt(authUser?.cognitoInfo?.userId || '0'),
    { skip: !authUser?.cognitoInfo?.userId }
  );

  const { data: payments, isLoading: paymentsLoading } = useGetPaymentsQuery(leases?.[0]?.id || 0, {
    skip: !leases?.[0]?.id,
  });

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;
  if (!property || propertyError) return <div>Error loading property</div>;

  const currentLease = leases?.find((lease) => lease.propertyId === property.id);

  return (
    <div className="dashboard-container">
      <div className="w-full mx-auto">
        <div className="md:flex gap-10">
          {currentLease && <ResidenceCard property={property} currentLease={currentLease} />}
          <PaymentMethod />
        </div>
        <BillingHistory payments={payments || []} />
      </div>
    </div>
  );
};

export default Residence;
