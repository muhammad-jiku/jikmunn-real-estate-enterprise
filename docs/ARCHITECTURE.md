# Architecture Overview

## Tech Stack

### Frontend (Client)
- **Framework:** Next.js 16.x
- **UI:** TailwindCSS 4.x, shadcn/ui components
- **State:** Redux Toolkit + RTK Query
- **Forms:** React Hook Form + Zod
- **Maps:** Mapbox GL
- **Auth:** AWS Cognito (via Amplify)

### Backend (Server)
- **Framework:** Express.js 5.x
- **ORM:** Prisma 7.x
- **Database:** Supabase PostgreSQL + PostGIS
- **Storage:** Cloudinary (images)
- **Auth:** AWS Cognito JWT verification
- **Payments:** Stripe
- **Real-time:** Socket.io (optional)
- **Email:** AWS SES / Resend

### Infrastructure
- **Hosting:** Vercel (both client and server)
- **Database:** Supabase
- **CDN:** Cloudinary
- **Auth:** AWS Cognito

## Directory Structure

```
├── client/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── (auth)/             # Auth pages
│   │   │   ├── (dashboard)/        # Dashboard layouts
│   │   │   │   ├── managers/       # Manager pages
│   │   │   │   └── tenants/        # Tenant pages
│   │   │   └── (nondashboard)/     # Public pages
│   │   ├── components/
│   │   │   ├── landing/            # Landing page components
│   │   │   ├── search/             # Property search components
│   │   │   ├── shared/             # Shared components
│   │   │   └── ui/                 # shadcn/ui components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # Utilities, constants, schemas
│   │   ├── state/                  # Redux store, API slice
│   │   └── types/                  # TypeScript types
│   └── public/                     # Static assets
│
├── server/
│   ├── src/
│   │   ├── app/
│   │   │   ├── middleware/         # Auth, error handling, rate limiting
│   │   │   └── v1/
│   │   │       ├── modules/        # Feature modules
│   │   │       │   ├── application/
│   │   │       │   ├── lease/
│   │   │       │   ├── manager/
│   │   │       │   ├── property/
│   │   │       │   ├── tenant/
│   │   │       │   ├── review/         # NEW
│   │   │       │   ├── maintenance/    # NEW
│   │   │       │   ├── notification/   # NEW
│   │   │       │   ├── message/        # NEW
│   │   │       │   └── payment/        # NEW
│   │   │       └── routes/
│   │   ├── config/                 # Cloudinary, Stripe, etc.
│   │   ├── lib/                    # Utilities, validators
│   │   └── index.ts                # Express app entry
│   └── prisma/
│       ├── schema.prisma           # Database schema
│       ├── seed.ts                 # Seed data
│       └── migrations/             # Migration history
│
└── docs/                           # Documentation
```

## API Endpoints

### Existing
- `GET /properties` - List properties with filters
- `GET /properties/:id` - Property details
- `POST /properties` - Create property (manager)
- `GET /tenants/:cognitoId` - Tenant profile
- `PUT /tenants/:cognitoId` - Update tenant
- `POST /tenants/:cognitoId/favorites/:propertyId` - Add favorite
- `DELETE /tenants/:cognitoId/favorites/:propertyId` - Remove favorite
- `GET /managers/:cognitoId` - Manager profile
- `PUT /managers/:cognitoId` - Update manager
- `GET /applications` - List applications
- `POST /applications` - Create application
- `PUT /applications/:id/status` - Update status
- `GET /leases` - List leases
- `GET /leases/:id/payments` - Lease payments

### New Endpoints
- `PUT /properties/:id` - Update property
- `DELETE /properties/:id` - Delete property
- `GET /reviews` - List reviews
- `POST /reviews` - Create review
- `GET /maintenance` - List maintenance requests
- `POST /maintenance` - Create request
- `PUT /maintenance/:id` - Update request
- `GET /notifications` - User notifications
- `PUT /notifications/:id/read` - Mark as read
- `GET /messages` - List conversations
- `POST /messages` - Send message
- `POST /payments/intent` - Create payment intent
- `POST /payments/webhook` - Stripe webhook
