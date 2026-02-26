/**
 * Data Transfer Object (DTO) Transformers
 *
 * This module provides type-safe transformers for converting database entities
 * into secure, client-friendly response objects.
 *
 * USAGE:
 * - Use these DTOs in controllers to transform Prisma query results
 * - DTOs strip sensitive fields and internal IDs
 * - Each entity has a transformer function and a TypeScript type
 */

import {
  Application,
  Lease,
  Location,
  MaintenanceRequest,
  Manager,
  Message,
  Notification,
  Payment,
  Property,
  Review,
  Tenant,
} from '@prisma/client';

// ============================================================================
// LOCATION DTOs
// ============================================================================

export interface LocationDTO {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export function toLocationDTO(location: Location): LocationDTO {
  return {
    address: location.address,
    city: location.city,
    state: location.state,
    country: location.country,
    postalCode: location.postalCode,
    coordinates: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
  };
}

// ============================================================================
// USER DTOs (Manager & Tenant)
// ============================================================================

/**
 * Public user info - safe to expose in responses
 * Does NOT include email, phone, or internal IDs
 */
export interface PublicUserDTO {
  id: number;
  name: string;
}

/**
 * Private user info - only for the user themselves
 * Includes email and phone but NOT cognitoId
 */
export interface PrivateUserDTO {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

export function toPublicUserDTO(user: Manager | Tenant): PublicUserDTO {
  return {
    id: user.id,
    name: user.name,
  };
}

export function toPrivateUserDTO(user: Manager | Tenant): PrivateUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
  };
}

// Manager-specific DTO with contact info (for property listings)
// Note: cognitoId is intentionally stripped for security
export interface ManagerContactDTO {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

export function toManagerContactDTO(manager: Manager): ManagerContactDTO {
  return {
    id: manager.id,
    name: manager.name,
    email: manager.email,
    phoneNumber: manager.phoneNumber,
  };
}

// ============================================================================
// PROPERTY DTOs
// ============================================================================

export interface PropertyListDTO {
  id: number;
  name: string;
  description: string;
  pricePerMonth: number;
  beds: number;
  baths: number;
  squareFeet: number;
  propertyType: string;
  photoUrls: string[];
  amenities: string[];
  isPetsAllowed: boolean;
  isParkingIncluded: boolean;
  averageRating: number | null;
  numberOfReviews: number | null;
  postedDate: Date;
  location: LocationDTO;
}

export interface PropertyDetailDTO extends PropertyListDTO {
  securityDeposit: number;
  applicationFee: number;
  highlights: string[];
  manager: ManagerContactDTO;
}

type PropertyWithLocation = Property & { location: Location };
type PropertyWithLocationAndManager = Property & {
  location: Location;
  manager: Manager;
};

export function toPropertyListDTO(property: PropertyWithLocation): PropertyListDTO {
  return {
    id: property.id,
    name: property.name,
    description: property.description,
    pricePerMonth: property.pricePerMonth,
    beds: property.beds,
    baths: property.baths,
    squareFeet: property.squareFeet,
    propertyType: property.propertyType,
    photoUrls: property.photoUrls,
    amenities: property.amenities,
    isPetsAllowed: property.isPetsAllowed,
    isParkingIncluded: property.isParkingIncluded,
    averageRating: property.averageRating,
    numberOfReviews: property.numberOfReviews,
    postedDate: property.postedDate,
    location: toLocationDTO(property.location),
  };
}

export function toPropertyDetailDTO(property: PropertyWithLocationAndManager): PropertyDetailDTO {
  return {
    ...toPropertyListDTO(property),
    securityDeposit: property.securityDeposit,
    applicationFee: property.applicationFee,
    highlights: property.highlights,
    manager: toManagerContactDTO(property.manager),
  };
}

// ============================================================================
// APPLICATION DTOs
// ============================================================================

export interface ApplicationDTO {
  id: number;
  applicationDate: Date;
  status: string;
  name: string;
  message: string | null;
  // Note: email and phoneNumber are only visible to the manager
}

export interface ApplicationWithContactDTO extends ApplicationDTO {
  email: string;
  phoneNumber: string;
  property?: PropertyListDTO;
}

export function toApplicationDTO(application: Application): ApplicationDTO {
  return {
    id: application.id,
    applicationDate: application.applicationDate,
    status: application.status,
    name: application.name,
    message: application.message,
  };
}

export function toApplicationWithContactDTO(
  application: Application,
  includeProperty?: Property & { location: Location }
): ApplicationWithContactDTO {
  return {
    ...toApplicationDTO(application),
    email: application.email,
    phoneNumber: application.phoneNumber,
    ...(includeProperty && { property: toPropertyListDTO(includeProperty) }),
  };
}

// ============================================================================
// LEASE DTOs
// ============================================================================

export interface LeaseDTO {
  id: number;
  startDate: Date;
  endDate: Date;
  rent: number;
  deposit: number;
}

export interface LeaseWithTenantDTO extends LeaseDTO {
  tenant: PublicUserDTO;
}

export interface LeaseWithPropertyDTO extends LeaseDTO {
  property: PropertyListDTO;
}

type LeaseWithTenant = Lease & { tenant: Tenant };
type LeaseWithProperty = Lease & { property: Property & { location: Location } };

export function toLeaseDTO(lease: Lease): LeaseDTO {
  return {
    id: lease.id,
    startDate: lease.startDate,
    endDate: lease.endDate,
    rent: lease.rent,
    deposit: lease.deposit,
  };
}

export function toLeaseWithTenantDTO(lease: LeaseWithTenant): LeaseWithTenantDTO {
  return {
    ...toLeaseDTO(lease),
    tenant: toPublicUserDTO(lease.tenant),
  };
}

export function toLeaseWithPropertyDTO(lease: LeaseWithProperty): LeaseWithPropertyDTO {
  return {
    ...toLeaseDTO(lease),
    property: toPropertyListDTO(lease.property),
  };
}

// ============================================================================
// PAYMENT DTOs
// ============================================================================

export interface PaymentDTO {
  id: number;
  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  paymentDate: Date | null;
  paymentStatus: string;
  paymentType: string;
  description: string | null;
  receiptUrl: string | null;
}

export function toPaymentDTO(payment: Payment): PaymentDTO {
  return {
    id: payment.id,
    amountDue: payment.amountDue,
    amountPaid: payment.amountPaid,
    dueDate: payment.dueDate,
    paymentDate: payment.paymentDate,
    paymentStatus: payment.paymentStatus,
    paymentType: payment.paymentType,
    description: payment.description,
    receiptUrl: payment.receiptUrl,
    // Note: Stripe IDs are internal and not exposed
  };
}

// ============================================================================
// REVIEW DTOs
// ============================================================================

export interface ReviewDTO {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  tenant: PublicUserDTO;
}

type ReviewWithTenant = Review & { tenant: Tenant };

export function toReviewDTO(review: ReviewWithTenant): ReviewDTO {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    tenant: toPublicUserDTO(review.tenant),
  };
}

// ============================================================================
// MAINTENANCE REQUEST DTOs
// ============================================================================

export interface MaintenanceRequestDTO {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  attachments: string[];
  createdAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
}

export interface MaintenanceRequestWithPropertyDTO extends MaintenanceRequestDTO {
  property: {
    id: number;
    name: string;
    address: string;
  };
}

type MaintenanceWithProperty = MaintenanceRequest & {
  property: Property & { location: Location };
};

export function toMaintenanceRequestDTO(request: MaintenanceRequest): MaintenanceRequestDTO {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    priority: request.priority,
    attachments: request.attachments,
    createdAt: request.createdAt,
    resolvedAt: request.resolvedAt,
    resolution: request.resolution,
  };
}

export function toMaintenanceRequestWithPropertyDTO(
  request: MaintenanceWithProperty
): MaintenanceRequestWithPropertyDTO {
  return {
    ...toMaintenanceRequestDTO(request),
    property: {
      id: request.property.id,
      name: request.property.name,
      address: request.property.location.address,
    },
  };
}

// ============================================================================
// NOTIFICATION DTOs
// ============================================================================

export interface NotificationDTO {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  createdAt: Date;
}

export function toNotificationDTO(notification: Notification): NotificationDTO {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    data: notification.data,
    createdAt: notification.createdAt,
  };
}

// ============================================================================
// MESSAGE DTOs
// ============================================================================

export interface MessageDTO {
  id: number;
  content: string;
  createdAt: Date;
  readAt: Date | null;
  sender: PublicUserDTO;
  isOwnMessage: boolean;
}

type MessageWithParticipants = Message & {
  senderTenant?: Tenant | null;
  senderManager?: Manager | null;
};

export function toMessageDTO(
  message: MessageWithParticipants,
  currentUserCognitoId: string
): MessageDTO {
  const sender = message.senderTenant || message.senderManager;
  const isOwnMessage =
    message.senderTenantCognitoId === currentUserCognitoId ||
    message.senderManagerCognitoId === currentUserCognitoId;

  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    readAt: message.readAt,
    sender: sender ? toPublicUserDTO(sender) : { id: 0, name: 'Unknown' },
    isOwnMessage,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Transform an array of entities using a DTO transformer
 */
export function toArrayDTO<T, R>(items: T[], transformer: (item: T) => R): R[] {
  return items.map(transformer);
}

/**
 * Conditionally transform an entity if it exists
 */
export function toOptionalDTO<T, R>(
  item: T | null | undefined,
  transformer: (item: T) => R
): R | null {
  return item ? transformer(item) : null;
}
