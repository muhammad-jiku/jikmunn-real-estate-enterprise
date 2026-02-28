'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useCompleteInitialPaymentMutation,
  useCreateInitialPaymentIntentMutation,
  useCreatePaymentIntentMutation,
  useGetApplicationsQuery,
  useGetAuthUserQuery,
  useGetLeasesQuery,
  useGetPropertyQuery,
} from '@/state/api';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle, Clock, CreditCard, DollarSign, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

interface PaymentFormPropsExtended extends PaymentFormProps {
  onPaymentConfirmed?: (paymentIntentId: string) => void;
  paymentSucceededButLeaseFailed?: boolean;
  onRetryLeaseCreation?: () => void;
  isRetryingLease?: boolean;
}

const PaymentForm = ({
  clientSecret,
  onSuccess,
  onCancel,
  onPaymentConfirmed,
  paymentSucceededButLeaseFailed,
  onRetryLeaseCreation,
  isRetryingLease,
}: PaymentFormPropsExtended) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSucceeded, setHasSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || isProcessing || hasSucceeded) {
      return;
    }

    setIsProcessing(true);

    try {
      // First, check if the PaymentIntent is already confirmed/succeeded
      // This handles cases where user returns from a redirect or previous attempt
      const { paymentIntent: existingIntent } = await stripe.retrievePaymentIntent(clientSecret);

      if (existingIntent?.status === 'succeeded') {
        // Payment already succeeded (e.g., from redirect or previous attempt)
        setHasSucceeded(true);
        toast.success('Payment confirmed!');
        // Notify parent that payment is confirmed (for potential retry of lease creation)
        onPaymentConfirmed?.(existingIntent.id);
        onSuccess(existingIntent.id);
        return;
      }

      // Proceed with confirmation only if not already succeeded
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Handle the specific case where payment was already confirmed
        if (error.code === 'payment_intent_unexpected_state') {
          // Try to retrieve the payment intent to get its current state
          const { paymentIntent: confirmedIntent } =
            await stripe.retrievePaymentIntent(clientSecret);
          if (confirmedIntent?.status === 'succeeded') {
            setHasSucceeded(true);
            toast.success('Payment confirmed!');
            onPaymentConfirmed?.(confirmedIntent.id);
            onSuccess(confirmedIntent.id);
            return;
          }
        }
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setHasSucceeded(true);
        toast.success('Payment successful!');
        onPaymentConfirmed?.(paymentIntent.id);
        onSuccess(paymentIntent.id);
      }
    } catch (_err) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // If payment succeeded but lease creation failed, show retry UI
  if (paymentSucceededButLeaseFailed) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800 mb-2">
            <CheckCircle size={20} className="text-green-600" />
            <span className="font-semibold">Payment Received</span>
          </div>
          <p className="text-sm text-amber-700">
            Your payment was successful, but we encountered an issue creating your lease. Please
            click below to retry. If the problem persists, contact support.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Close
          </Button>
          <Button
            type="button"
            onClick={onRetryLeaseCreation}
            disabled={isRetryingLease}
            className="flex-1 bg-primary-700 text-white hover:bg-primary-600"
          >
            {isRetryingLease ? 'Retrying...' : 'Retry Lease Creation'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-primary-700 text-white hover:bg-primary-600"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
      </div>
    </form>
  );
};

interface ApprovedTenantPaymentProps {
  propertyId: number;
}

export const ApprovedTenantPayment = ({ propertyId }: ApprovedTenantPaymentProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property } = useGetPropertyQuery(propertyId);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<{
    securityDeposit: number;
    firstMonthRent: number;
    applicationFee: number;
    total: number;
  } | null>(null);
  const [isInitialPayment, setIsInitialPayment] = useState(false);
  const [currentApplicationId, setCurrentApplicationId] = useState<number | null>(null);

  const cognitoId = authUser?.cognitoInfo?.userId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userType = (authUser as any)?.userRole as string | undefined;

  // Get applications of the tenant for this property
  const { data: applications, refetch: refetchApplications } = useGetApplicationsQuery(
    { userId: cognitoId, userType },
    { skip: !cognitoId || userType !== 'tenant' }
  );

  // Get leases for the tenant (server filters by authenticated user)
  const { data: leases, refetch: refetchLeases } = useGetLeasesQuery(undefined, {
    skip: !cognitoId || userType !== 'tenant',
  });

  const [createPaymentIntent, { isLoading: isCreatingIntent }] = useCreatePaymentIntentMutation();
  const [createInitialPaymentIntent, { isLoading: isCreatingInitialIntent }] =
    useCreateInitialPaymentIntentMutation();
  const [completeInitialPayment, { isLoading: isCompletingPayment }] =
    useCompleteInitialPaymentMutation();

  // Track when payment succeeded but lease creation failed
  const [paymentSucceededButLeaseFailed, setPaymentSucceededButLeaseFailed] = useState(false);
  const [confirmedPaymentIntentId, setConfirmedPaymentIntentId] = useState<string | null>(null);

  // Check for applications awaiting payment (manager approved, waiting for initial payment)
  const awaitingPaymentApplication = applications?.find(
    (app) => app.propertyId === propertyId && app.status === 'AwaitingPayment'
  );

  // Check if tenant has a fully approved application with lease
  const approvedApplication = applications?.find(
    (app) => app.propertyId === propertyId && app.status === 'Approved'
  );

  // Find the lease for this property
  const currentLease = leases?.find((lease) => lease.propertyId === propertyId);

  // Don't render if user is not a tenant or doesn't have an approved/awaiting payment application
  if (!authUser || userType !== 'tenant' || (!approvedApplication && !awaitingPaymentApplication)) {
    return null;
  }

  // Handle initial payment (security deposit + first month rent + app fee)
  const handleInitialPayment = async () => {
    if (!awaitingPaymentApplication) return;

    try {
      const result = await createInitialPaymentIntent({
        applicationId: awaitingPaymentApplication.id,
      }).unwrap();

      setClientSecret(result.clientSecret);
      setPaymentBreakdown(result.breakdown);
      setIsInitialPayment(true);
      setCurrentApplicationId(awaitingPaymentApplication.id);
      setIsPaymentModalOpen(true);
    } catch (_error) {
      toast.error('Failed to initialize payment. Please try again.');
    }
  };

  // Handle monthly rent payment
  const handleMonthlyPayment = async () => {
    if (!currentLease || !property) {
      toast.error('Unable to find lease information. Please contact support.');
      return;
    }

    try {
      const result = await createPaymentIntent({
        leaseId: currentLease.id,
        amount: property.pricePerMonth,
        paymentType: 'rent',
      }).unwrap();

      setClientSecret(result.clientSecret);
      setPaymentBreakdown(null);
      setIsInitialPayment(false);
      setIsPaymentModalOpen(true);
    } catch (_error) {
      toast.error('Failed to initialize payment. Please try again.');
    }
  };

  const handlePaymentConfirmed = (paymentIntentId: string) => {
    // Store the confirmed payment intent ID for potential retry
    setConfirmedPaymentIntentId(paymentIntentId);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (isInitialPayment && currentApplicationId) {
      // Complete the initial payment and create lease
      try {
        await completeInitialPayment({
          applicationId: currentApplicationId,
          stripePaymentId: paymentIntentId,
        }).unwrap();

        // Success - refetch data and close modal
        refetchApplications();
        refetchLeases();

        // Reset all state
        setIsPaymentModalOpen(false);
        setClientSecret(null);
        setPaymentBreakdown(null);
        setIsInitialPayment(false);
        setCurrentApplicationId(null);
        setPaymentSucceededButLeaseFailed(false);
        setConfirmedPaymentIntentId(null);
      } catch (_error) {
        // Payment succeeded but lease creation failed
        // Keep modal open and show retry UI
        setPaymentSucceededButLeaseFailed(true);
        setConfirmedPaymentIntentId(paymentIntentId);
        // Note: The mutation's onQueryStarted already shows the error toast
      }
    } else {
      // For non-initial payments (monthly rent), just close
      setIsPaymentModalOpen(false);
      setClientSecret(null);
      setPaymentBreakdown(null);
      setIsInitialPayment(false);
      setCurrentApplicationId(null);
    }
  };

  const handleRetryLeaseCreation = async () => {
    if (currentApplicationId && confirmedPaymentIntentId) {
      try {
        await completeInitialPayment({
          applicationId: currentApplicationId,
          stripePaymentId: confirmedPaymentIntentId,
        }).unwrap();

        // Success - refetch data and close modal
        refetchApplications();
        refetchLeases();

        // Reset all state
        setIsPaymentModalOpen(false);
        setClientSecret(null);
        setPaymentBreakdown(null);
        setIsInitialPayment(false);
        setCurrentApplicationId(null);
        setPaymentSucceededButLeaseFailed(false);
        setConfirmedPaymentIntentId(null);
      } catch (_error) {
        // Still failing - keep the retry UI visible
        // The mutation's onQueryStarted already shows the error toast
      }
    }
  };

  const handleModalClose = () => {
    // Only allow closing if payment hasn't succeeded yet, or if lease creation succeeded
    if (!paymentSucceededButLeaseFailed) {
      setIsPaymentModalOpen(false);
      setClientSecret(null);
      setPaymentBreakdown(null);
      setIsInitialPayment(false);
      setCurrentApplicationId(null);
      setConfirmedPaymentIntentId(null);
    }
  };

  // Show awaiting payment UI (initial payment required)
  if (awaitingPaymentApplication) {
    return (
      <>
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 h-fit min-w-[300px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center p-3 bg-amber-500 rounded-full">
              <Clock className="text-white" size={20} />
            </div>
            <div>
              <p className="text-amber-800 font-semibold">Application Approved!</p>
              <p className="text-sm text-amber-600">Complete payment to finalize</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 mb-4 border border-amber-100">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} />
              Initial Payment Breakdown
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Security Deposit</span>
                <span className="font-medium">
                  ${property?.securityDeposit?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">First Month&apos;s Rent</span>
                <span className="font-medium">
                  ${property?.pricePerMonth?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Application Fee</span>
                <span className="font-medium">
                  ${property?.applicationFee?.toLocaleString() || '0'}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-semibold text-gray-800">Total Due</span>
                <span className="font-bold text-primary-800">
                  $
                  {(
                    (property?.securityDeposit || 0) +
                    (property?.pricePerMonth || 0) +
                    (property?.applicationFee || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleInitialPayment}
            disabled={isCreatingInitialIntent}
            className="w-full bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center gap-2"
          >
            <CreditCard size={18} />
            {isCreatingInitialIntent ? 'Processing...' : 'Pay & Start Lease'}
          </Button>

          <p className="text-xs text-amber-600 mt-3 text-center">
            Your lease will be activated immediately after payment
          </p>
        </div>

        {/* Payment Modal for Initial Payment */}
        <Dialog open={isPaymentModalOpen} onOpenChange={(open) => !open && handleModalClose()}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Initial Payment
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {paymentBreakdown && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Security Deposit</span>
                    <span>${paymentBreakdown.securityDeposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">First Month&apos;s Rent</span>
                    <span>${paymentBreakdown.firstMonthRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Application Fee</span>
                    <span>${paymentBreakdown.applicationFee.toLocaleString()}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${paymentBreakdown.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#0f766e',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handleModalClose}
                    onPaymentConfirmed={handlePaymentConfirmed}
                    paymentSucceededButLeaseFailed={paymentSucceededButLeaseFailed}
                    onRetryLeaseCreation={handleRetryLeaseCreation}
                    isRetryingLease={isCompletingPayment}
                  />
                </Elements>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show monthly payment UI (lease already exists)
  return (
    <>
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 h-fit min-w-[300px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center p-3 bg-green-500 rounded-full">
            <CheckCircle className="text-white" size={20} />
          </div>
          <div>
            <p className="text-green-800 font-semibold">Lease Active</p>
            <p className="text-sm text-green-600">You can make monthly payments</p>
          </div>
        </div>

        {currentLease ? (
          <>
            <div className="bg-white rounded-xl p-4 mb-4 border border-green-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Monthly Rent</span>
                <span className="text-2xl font-bold text-primary-800">
                  ${property?.pricePerMonth?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Lease Period: {new Date(currentLease.startDate).toLocaleDateString()} -{' '}
                {new Date(currentLease.endDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Due on the 1st of each month (5-day grace period)
              </div>
            </div>

            <Button
              onClick={handleMonthlyPayment}
              disabled={isCreatingIntent}
              className="w-full bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              {isCreatingIntent ? 'Processing...' : 'Make Payment'}
            </Button>
          </>
        ) : (
          <div className="bg-white rounded-xl p-4 border border-green-100 text-center">
            <DollarSign className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-gray-600 text-sm">
              Your lease is being prepared. You will be able to make payments once the lease is
              active.
            </p>
          </div>
        )}
      </div>

      {/* Payment Modal for Monthly Rent */}
      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => !open && handleModalClose()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Monthly Rent Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount</span>
                <span className="text-xl font-bold">
                  ${property?.pricePerMonth?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0f766e',
                    },
                  },
                }}
              >
                <PaymentForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handleModalClose}
                />
              </Elements>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
