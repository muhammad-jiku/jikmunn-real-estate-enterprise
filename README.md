# Jikmunn Real Estate Enterprise

_A full-stack real estate management platform built with Next.js, Express, PostgreSQL, and AWS._

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
- **Database:** PostgreSQL 🐘 – reliable relational database
- **Storage:** Amazon S3 ☁️ – secure and scalable file storage
- **Deployment:** AWS (EC2, RDS, S3, Amplify) 🚀 – cloud-native deployment

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
AWS_REGION= # Your AWS Region
S3_BUCKET_NAME= # Your S3 Bucket Name
AWS_ACCESS_KEY_ID= # Your AWS IAM Account Access Key
AWS_SECRET_ACCESS_KEY= # Your AWS IAM Account Secret Access Key
DATABASE_URL= # Your RDS PostgreSQL Database URL
```

Run the backend server:

```bash
yarn dev
```

---

✅ You’re all set! The frontend will run on `http://localhost:3000` and the backend on your configured API base URL.
