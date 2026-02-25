'use client';

import { MessageButton } from '@/components/messages/SendMessageDialog';
import ApplicationCard from '@/components/shared/card/ApplicationCard';
import Header from '@/components/shared/Header';
import Loading from '@/components/shared/Loading';
import { useGetApplicationsQuery, useGetAuthUserQuery } from '@/state/api';
import { CircleCheckBig, Clock, Download, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const Applications = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: applications,
    isLoading,
    isError,
  } = useGetApplicationsQuery({
    userId: authUser?.cognitoInfo?.userId,
    userType: 'tenant',
  });

  // Download utility function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDownloadAgreement = (application: any) => {
    const content = `
APPLICATION AGREEMENT
=====================

Application ID: ${application.id}
Status: ${application.status}
Application Date: ${new Date(application.applicationDate).toLocaleDateString()}

Property: ${application.property?.name || 'N/A'}
Address: ${application.property?.location?.address || 'N/A'}, ${application.property?.location?.city || ''}, ${application.property?.location?.state || ''}

Applicant: ${application.name}
Email: ${application.email}
Phone: ${application.phoneNumber}

${application.lease ? `
Lease Information:
- Start Date: ${new Date(application.lease.startDate).toLocaleDateString()}
- End Date: ${new Date(application.lease.endDate).toLocaleDateString()}
- Monthly Rent: $${application.lease.rent}
` : ''}

Thank you for choosing RENTIFUL!
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-${application.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded application agreement`);
  };

  if (isLoading) return <Loading />;
  if (isError || !applications) return <div>Error fetching applications</div>;

  return (
    <div className='dashboard-container'>
      <Header
        title='Applications'
        subtitle='Track and manage your property rental applications'
      />
      <div className='w-full'>
        {applications?.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            userType='renter'
          >
            <div className='flex justify-between gap-5 w-full pb-4 px-4'>
              {application.status === 'Approved' ? (
                <div className='bg-green-100 p-4 text-green-700 grow flex items-center'>
                  <CircleCheckBig className='w-5 h-5 mr-2' />
                  The property is being rented by you until{' '}
                  {application.lease?.endDate ? new Date(application.lease.endDate).toLocaleDateString() : 'N/A'}.{' '}
                  <a
                    href={`/search/${application.propertyId}`}
                    className='underline ml-1 hover:text-green-900'
                  >
                    View property
                  </a>
                </div>
              ) : application.status === 'AwaitingPayment' ? (
                <div className='bg-blue-100 p-4 text-blue-700 grow flex items-center'>
                  <CircleCheckBig className='w-5 h-5 mr-2' />
                  Your application has been approved!{' '}
                  <a
                    href={`/search/${application.propertyId}`}
                    className='underline ml-1 hover:text-blue-900'
                  >
                    Complete payment to secure the property
                  </a>
                </div>
              ) : application.status === 'Pending' ? (
                <div className='bg-yellow-100 p-4 text-yellow-700 grow flex items-center'>
                  <Clock className='w-5 h-5 mr-2' />
                  Your application is pending approval.{' '}
                  <a
                    href={`/search/${application.propertyId}`}
                    className='underline ml-1 hover:text-yellow-900'
                  >
                    View property
                  </a>
                </div>
              ) : (
                <div className='bg-red-100 p-4 text-red-700 grow flex items-center'>
                  <XCircle className='w-5 h-5 mr-2' />
                  Your application has been denied.{' '}
                  <a
                    href={`/search/${application.propertyId}`}
                    className='underline ml-1 hover:text-red-900'
                  >
                    View property
                  </a>
                </div>
              )}

              <button
                onClick={() => handleDownloadAgreement(application)}
                className={`bg-white border border-gray-300 text-gray-700 py-2 px-4
                          rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50`}
              >
                <Download className='w-5 h-5 mr-2' />
                Download Agreement
              </button>
              
              {application.property?.managerCognitoId && (
                <MessageButton
                  recipientId={application.property.managerCognitoId}
                  recipientName={application.property.manager?.name || 'Manager'}
                  recipientType="manager"
                  propertyId={application.property.id}
                  propertyName={application.property.name}
                  context="application"
                  variant="outline"
                />
              )}
            </div>
          </ApplicationCard>
        ))}
      </div>
    </div>
  );
};

export default Applications;
