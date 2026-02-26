import { MotionProps as OriginalMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Application, Lease, Manager, Payment, Property, Tenant } from './prismaTypes';

// Clerk user info type (replaces AWS Amplify AuthUser)
interface ClerkUserInfo {
  userId: string;
  username?: string;
}

declare module 'framer-motion' {
  interface MotionProps extends OriginalMotionProps {
    className?: string;
  }
}

// Extended types with relations - these match what the API returns
declare global {
  // Location type (matches Prisma Location model)
  interface Location {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }

  // Extended ApplicationStatus including AwaitingPayment (matches Prisma schema)
  type ExtendedApplicationStatus = 'Pending' | 'Denied' | 'Approved' | 'AwaitingPayment';

  // Extended Manager with optional image
  interface ManagerWithImage extends Manager {
    image?: string;
    photoUrl?: string;
  }

  // Extended Tenant with relations
  interface TenantWithRelations extends Tenant {
    favorites?: Property[];
    favoritePropertyIds?: number[];
    image?: string;
    photoUrl?: string;
  }

  // Extended Property with relations
  interface PropertyWithRelations extends Property {
    location?: Location;
    manager?: ManagerWithImage;
  }

  // Extended Application with relations
  interface ApplicationWithRelations extends Omit<Application, 'status' | 'applicationDate'> {
    status: ExtendedApplicationStatus;
    applicationDate: Date | string;
    property?: PropertyWithRelations;
    tenant?: TenantWithRelations;
    lease?: LeaseWithRelations;
    manager?: ManagerWithImage;
  }

  // Extended Lease with relations
  interface LeaseWithRelations extends Lease {
    tenant?: TenantWithRelations;
    property?: PropertyWithRelations;
    payments?: Payment[];
    nextPaymentDate?: Date;
  }

  // Extended Payment with optional fields
  interface PaymentWithRelations extends Payment {
    paymentMethod?: string;
  }

  interface SidebarLinkProps {
    href: string;
    icon: LucideIcon;
    label: string;
  }

  interface PropertyOverviewProps {
    propertyId: number;
  }

  interface ApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: number;
  }

  interface ContactWidgetProps {
    onOpenModal: () => void;
    propertyId: number;
  }

  interface ImagePreviewsProps {
    // images: string[];
    images: { primary: string; fallback: string }[];
  }

  interface PropertyDetailsProps {
    propertyId: number;
  }

  interface PropertyOverviewProps {
    propertyId: number;
  }

  interface PropertyLocationProps {
    propertyId: number;
  }

  interface ApplicationCardProps {
    application: ApplicationWithRelations;
    userType: 'manager' | 'renter';
    children: React.ReactNode;
  }

  interface CardProps {
    property: PropertyWithRelations;
    isFavorite: boolean;
    onFavoriteToggle: () => void;
    showFavoriteButton?: boolean;
    propertyLink?: string;
    showEditDelete?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
  }

  interface CardCompactProps {
    property: PropertyWithRelations;
    isFavorite: boolean;
    onFavoriteToggle: () => void;
    showFavoriteButton?: boolean;
    propertyLink?: string;
  }

  interface HeaderProps {
    title: string;
    subtitle: string;
  }

  interface NavbarProps {
    isDashboard: boolean;
  }

  interface AppSidebarProps {
    userType: 'manager' | 'tenant';
  }

  interface SettingsFormProps {
    initialData: SettingsFormData;
    onSubmit: (data: SettingsFormData) => Promise<void>;
    userType: 'manager' | 'tenant';
  }

  // User info type that includes the image field
  interface UserInfo {
    id: number;
    cognitoId: string;
    name: string;
    email: string;
    phoneNumber: string;
    image?: string;
    photoUrl?: string;
  }

  interface User {
    cognitoInfo: ClerkUserInfo;
    userInfo: UserInfo;
    userRole: string;
  }
}

export { };

