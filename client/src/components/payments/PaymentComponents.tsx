'use client';

import {
    useCreatePaymentIntentMutation,
    useGetAuthUserQuery,
    useGetTenantPaymentsQuery,
} from '@/state/api';
import { Payment } from '@/types/prismaTypes';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Card,
    CardContent
} from '../ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const statusConfig = {
  Paid: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  Pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  PartiallyPaid: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800' },
  Overdue: { icon: AlertCircle, color: 'bg-red-100 text-red-800' },
};

interface PaymentFormProps {
  leaseId: number;
  propertyName: string;
  amountDue: number;
  dueDate?: string;
}

export function PaymentForm({
  leaseId,
  propertyName,
  amountDue,
  dueDate,
}: PaymentFormProps) {
  const { data: _authUser } = useGetAuthUserQuery();
  const [createPaymentIntent, { isLoading }] = useCreatePaymentIntentMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(amountDue.toString());
  const [_clientSecret, setClientSecret] = useState<string | null>(null);

  const handlePayment = async () => {
    const result = await createPaymentIntent({
      leaseId,
      amount: parseFloat(amount),
      paymentType: 'rent',
    });

    if ('data' in result && result.data?.clientSecret) {
      setClientSecret(result.data.clientSecret);
      // In a real implementation, you would redirect to Stripe Checkout
      // or use Stripe Elements to complete the payment
      window.open(
        `https://checkout.stripe.com/c/pay/${result.data.paymentIntentId}`,
        '_blank'
      );
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <CreditCard className="w-4 h-4 mr-2" />
          Make Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Property</p>
            <p className="font-medium">{propertyName}</p>
          </div>

          <div>
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                min="0"
                step="0.01"
              />
            </div>
            {dueDate && (
              <p className="text-sm text-gray-500 mt-1">
                Due: {new Date(dueDate).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setAmount(amountDue.toString())}
            >
              Full Amount (${amountDue.toFixed(2)})
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setAmount((amountDue / 2).toFixed(2))}
            >
              Half (${(amountDue / 2).toFixed(2)})
            </Button>
          </div>

          <Button
            onClick={handlePayment}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="w-full"
          >
            {isLoading ? 'Processing...' : `Pay $${parseFloat(amount).toFixed(2)}`}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Powered by Stripe. Your payment information is secure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentHistory() {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: payments, isLoading } = useGetTenantPaymentsQuery(
    authUser?.cognitoInfo?.userId || '',
    { skip: !authUser?.cognitoInfo?.userId }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No payment history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment: Payment) => {
        const status = payment.paymentStatus as keyof typeof statusConfig;
        const StatusIcon = statusConfig[status]?.icon || Clock;
        const statusColor = statusConfig[status]?.color || 'bg-gray-100 text-gray-800';

        return (
          <Card key={payment.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      ${payment.amountPaid?.toFixed(2) || '0.00'}
                      {payment.amountDue !== payment.amountPaid && (
                        <span className="text-gray-500 text-sm ml-1">
                          of ${payment.amountDue?.toFixed(2)}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={statusColor}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {payment.paymentStatus}
                  </Badge>
                  {payment.paymentDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Paid: {new Date(payment.paymentDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
