# Jikmunn Real Estate Enterprise - Project Documentation

## Project Overview

**Project Name:** Jikmunn Real Estate Enterprise (Rentiful)  
**Subtitle:** A Modern Full-Stack Real Estate Management Platform  
**Project Type:** Super Advanced  
**Version:** 1.0.0

---

## Description

Jikmunn Real Estate Enterprise is a comprehensive, production-ready real estate management platform designed for both tenants and property managers.

### Key Features

- **Multi-Role Authentication** - Secure role-based access control with Clerk authentication for tenants and managers
- **Property Management** - Full CRUD operations for property listings with advanced filtering and search capabilities
- **Interactive Maps** - Mapbox-powered geographic search with location-based property discovery
- **Real-Time Messaging** - Pusher-powered instant messaging system between tenants and property managers
- **Payment Processing** - Stripe integration for secure rent payments, deposits, and application fees
- **Maintenance Ticketing** - Complete maintenance request system with status tracking and priority levels
- **Review System** - Property reviews and ratings with automatic average calculation
- **Notification System** - In-app notifications for applications, payments, maintenance updates, and messages
- **Lease Management** - Digital lease tracking with payment history and renewal alerts
- **Responsive Design** - Mobile-first UI with TailwindCSS and shadcn/ui components
- **Comprehensive Testing** - Unit tests with Jest and E2E tests with Playwright
- **Type Safety** - End-to-end TypeScript implementation with Zod validation

---

## Tech Stacks

### Frontend

| Technology      | Version | Purpose                             |
| --------------- | ------- | ----------------------------------- |
| Next.js         | 16.x    | React framework with App Router     |
| React           | 19.x    | UI library                          |
| TypeScript      | 5.x     | Type-safe JavaScript                |
| TailwindCSS     | 4.x     | Utility-first CSS framework         |
| shadcn/ui       | Latest  | Accessible UI components (Radix UI) |
| Redux Toolkit   | 2.x     | State management                    |
| RTK Query       | 2.x     | API data fetching and caching       |
| React Hook Form | 7.x     | Form handling                       |
| Zod             | 4.x     | Schema validation                   |
| Mapbox GL       | 3.x     | Interactive maps                    |
| Framer Motion   | 12.x    | Animations                          |
| Clerk           | 6.x     | Authentication                      |
| Stripe.js       | 8.x     | Payment UI components               |
| Pusher.js       | 8.x     | Real-time WebSocket client          |
| FilePond        | 4.x     | File uploads                        |
| Lucide React    | Latest  | Icon library                        |
| date-fns        | 4.x     | Date utilities                      |

### Backend

| Technology         | Version | Purpose                         |
| ------------------ | ------- | ------------------------------- |
| Node.js            | 20+     | JavaScript runtime              |
| Express.js         | 5.x     | Web framework                   |
| TypeScript         | 5.x     | Type-safe JavaScript            |
| Prisma             | 6.x     | ORM with type-safe queries      |
| PostgreSQL         | 15+     | Primary database                |
| PostGIS            | 3.x     | Geospatial database extension   |
| Supabase           | Latest  | Database hosting and management |
| Clerk Express      | 1.x     | JWT verification middleware     |
| Stripe             | 20.x    | Payment processing              |
| Pusher             | 5.x     | Real-time WebSocket server      |
| Cloudinary         | 2.x     | Image storage and CDN           |
| Winston            | 3.x     | Logging                         |
| Helmet             | 8.x     | Security headers                |
| express-rate-limit | 8.x     | API rate limiting               |
| Zod                | 4.x     | Input validation                |
| Morgan             | 1.x     | HTTP request logging            |
| node-cron          | 3.x     | Task scheduling                 |

### Database Schema

| Model              | Description                                               |
| ------------------ | --------------------------------------------------------- |
| Property           | Real estate listings with amenities, photos, and location |
| Location           | Geographic coordinates with PostGIS support               |
| Manager            | Property manager profiles                                 |
| Tenant             | Tenant profiles with favorites                            |
| Application        | Rental applications with status workflow                  |
| Lease              | Active lease agreements                                   |
| Payment            | Payment records (rent, deposits, fees)                    |
| Review             | Property reviews and ratings                              |
| MaintenanceRequest | Maintenance tickets with priority                         |
| Message            | Tenant-Manager communication                              |
| Notification       | In-app notification system                                |

---

## Development Tools

### Build & Development

| Tool            | Purpose                               |
| --------------- | ------------------------------------- |
| Yarn Workspaces | Monorepo package management           |
| Concurrently    | Run multiple processes simultaneously |
| Nodemon         | Auto-restart server on changes        |
| ts-node         | TypeScript execution                  |
| tsx             | Fast TypeScript execution             |
| SWC             | Fast TypeScript/JavaScript compiler   |
| PostCSS         | CSS processing                        |

### Testing

| Tool            | Purpose                         |
| --------------- | ------------------------------- |
| Jest            | Unit testing framework          |
| Testing Library | React component testing         |
| Playwright      | End-to-end browser testing      |
| Supertest       | HTTP assertions for API testing |
| ts-jest         | TypeScript Jest transformer     |
| @swc/jest       | Fast Jest transformer           |

### Code Quality

| Tool                   | Purpose                       |
| ---------------------- | ----------------------------- |
| ESLint                 | JavaScript/TypeScript linting |
| Prettier               | Code formatting               |
| TypeScript             | Static type checking          |
| Husky                  | Git hooks                     |
| lint-staged            | Run linters on staged files   |
| next/eslint-plugin     | Next.js specific rules        |
| eslint-plugin-jsx-a11y | Accessibility rules           |

### Database Tools

| Tool          | Purpose                         |
| ------------- | ------------------------------- |
| Prisma CLI    | Database migrations and seeding |
| Prisma Studio | Database GUI                    |

### Deployment

| Platform   | Purpose                |
| ---------- | ---------------------- |
| Vercel     | Serverless deployment  |
| Supabase   | Database hosting       |
| Cloudinary | Image hosting and CDN  |
| Clerk      | Authentication service |

---

## Project Structure

```
jikmunn-real-estate-enterprise/
├── client/                 # Next.js frontend
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   │   ├── (auth)/     # Authentication pages
│   │   │   ├── (dashboard)/ # Protected dashboard
│   │   │   └── (nondashboard)/ # Public pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and schemas
│   │   ├── state/          # Redux store
│   │   └── types/          # TypeScript types
│   ├── e2e/                # Playwright tests
│   └── public/             # Static assets
│
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── app/
│   │   │   ├── middleware/ # Auth, error, rate limiting
│   │   │   └── v1/         # API v1
│   │   │       ├── modules/ # Feature modules
│   │   │       └── routes/  # Route definitions
│   │   ├── config/         # External services config
│   │   └── lib/            # Utilities and services
│   └── prisma/             # Database schema and migrations
│
└── docs/                   # Documentation
```

---

## API Architecture

### Versioned API

All endpoints follow RESTful conventions under `/api/v1/`

### Core Modules

- **Properties** - CRUD operations with geospatial search
- **Tenants** - Profile management and favorites
- **Managers** - Profile and property management
- **Applications** - Rental application workflow
- **Leases** - Lease agreement management
- **Payments** - Stripe payment processing
- **Reviews** - Property reviews and ratings
- **Maintenance** - Maintenance request system
- **Messages** - Real-time messaging
- **Notifications** - In-app notifications

### Security Features

- JWT verification with Clerk
- Role-based access control
- Rate limiting
- Helmet security headers
- Input validation with Zod
- Audit logging

---

## Getting Started

> You will need [Node.js](https://nodejs.org/en/) 20+ installed.

### Prerequisites

- Node.js 20+
- Yarn
- PostgreSQL with PostGIS
- Accounts: Supabase, Clerk, Stripe, Cloudinary, Mapbox, Pusher

### 1. Clone the Repository

```bash
git clone https://github.com/muhammad-jiku/jikmunn-real-estate-enterprise.git
cd jikmunn-real-estate-enterprise
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Frontend Setup

```bash
cd client
```

Create an `.env` file inside the `client` folder:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN= # Your Mapbox Access Token
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= # Your Clerk Publishable Key
CLERK_SECRET_KEY= # Your Clerk Secret Key
NEXT_PUBLIC_API_BASE_URL= # Your API Base URL
NEXT_PUBLIC_PUSHER_KEY= # Your Pusher Key
NEXT_PUBLIC_PUSHER_CLUSTER= # Your Pusher Cluster
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Your Stripe Publishable Key
```

### 4. Backend Setup

```bash
cd server
```

Create an `.env` file inside the `server` folder:

```bash
PORT=8000 # Server port
DATABASE_URL= # Your Supabase PostgreSQL Connection String
DIRECT_URL= # Your Supabase Direct Connection URL
CLOUDINARY_CLOUD_NAME= # Your Cloudinary Cloud Name
CLOUDINARY_API_KEY= # Your Cloudinary API Key
CLOUDINARY_API_SECRET= # Your Cloudinary API Secret
CLERK_SECRET_KEY= # Your Clerk Secret Key
CLERK_WEBHOOK_SECRET= # Your Clerk Webhook Secret
STRIPE_SECRET_KEY= # Your Stripe Secret Key
STRIPE_WEBHOOK_SECRET= # Your Stripe Webhook Secret
PUSHER_APP_ID= # Your Pusher App ID
PUSHER_KEY= # Your Pusher Key
PUSHER_SECRET= # Your Pusher Secret
PUSHER_CLUSTER= # Your Pusher Cluster
```

### 5. Database Setup

Run database migrations:

```bash
cd server
yarn prisma:generate
yarn prisma:migrate
```

Seed the database (optional):

```bash
yarn seed
```

### 6. Start Development Servers

From the root directory:

```bash
yarn dev
```

Or run client and server separately:

```bash
# Terminal 1 - Client
cd client && yarn dev

# Terminal 2 - Server
cd server && yarn dev
```

**Done!** The frontend will run on `http://localhost:3000` and the backend on `http://localhost:8000`.

---

## License

This project is for portfolio and educational purposes.

---

## Author

**Muhammad Jiku**  
GitHub: [@muhammad-jiku](https://github.com/muhammad-jiku)
