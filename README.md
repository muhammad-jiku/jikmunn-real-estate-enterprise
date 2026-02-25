# Jikmunn Real Estate Enterprise

_A full-stack real estate management platform built with Next.js, Express, Supabase, and AWS Cognito._

Rentiful is a real estate application built under the Jikmunn Real Estate Enterprise project. It enables tenants to sign in, search for suitable properties, and complete purchases seamlessly, while managers can efficiently oversee and manage leases.

[![IMAGE ALT TEXT HERE](https://jikmunn-real-estate-enterprise-s3-images.s3.ap-southeast-1.amazonaws.com/banner.png)](https://main.d3rbuo7pe8yfmf.amplifyapp.com/)  
👉 Click the image to visit the site.

<!-- Inspired by Python version: https://github.com/biobootloader/wolverine -->

---

## 🎉 Roadmap

This project is currently available, with the following features:

- Responsive Web UI for tenants and managers 🌐
- Tenant dashboard to browse, filter, and purchase properties 🏡
- Manager dashboard to manage leases, payments, and tenants 📊
- Secure authentication & role-based access control 🔐
- Advanced property search with filters and maps 🗺️

<!-- Planned features include:
- Integration with payment gateways 💳
- Notifications for rent due dates, approvals, and updates 🔔
- Lease contract generation and digital signatures ✍️
- Multi-language and multi-currency support 🌍
- Mobile app version for iOS and Android 📱   -->

---

## 🛠️ Tech Stack

- **Frontend:** Next.js with TailwindCSS ⚡ – fast, scalable UI development
- **Backend:** Express.js with Prisma ORM 🔗 – efficient API and database handling
- **Database:** Supabase (PostgreSQL) 🐘 – reliable relational database with PostGIS
- **Authentication:** AWS Cognito 🔐 – secure user authentication
- **Storage:** Cloudinary 🖼️ – optimized image management
- **Deployment:** Vercel 🚀 – serverless deployment for both client and server

---

## 👨‍🚀 Getting Started

> 🚧 You will need [Node.js](https://nodejs.org/en/) installed.

### 1. Clone the repository

```bash
git clone https://github.com/muhammad-jiku/jikmunn-real-estate-enterprise.git
```

---

### 2. Frontend Setup

```bash
cd client
yarn
```

Create an `.env` file inside the `client` folder:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN= # Your Mapbox Access Token
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID= # Your AWS Cognito Pool ID
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID= # Your AWS Cognito Client ID
NEXT_PUBLIC_API_BASE_URL= # Your API Base URL
```

Run the development server:

```bash
yarn dev
```

---

### 3. Backend Setup

```bash
cd server
yarn
```

Create an `.env` file inside the `server` folder:

```bash
PORT=8000 # Server port
DATABASE_URL= # Your Supabase PostgreSQL Connection String
CLOUDINARY_CLOUD_NAME= # Your Cloudinary Cloud Name
CLOUDINARY_API_KEY= # Your Cloudinary API Key
CLOUDINARY_API_SECRET= # Your Cloudinary API Secret
```

Run database migrations:

```bash
yarn prisma:generate
npx prisma migrate deploy
```

Run the backend server:

```bash
yarn dev
```

---

✅ You’re all set! The frontend will run on `http://localhost:3000` and the backend on your configured API base URL.
