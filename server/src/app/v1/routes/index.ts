import express from 'express';
import { ApplicationRoutes } from '../modules/application/application.routes';
import { LeaseRoutes } from '../modules/lease/lease.routes';
import { MaintenanceRoutes } from '../modules/maintenance/maintenance.routes';
import { ManagerRoutes } from '../modules/manager/manager.routes';
import { MessageRoutes } from '../modules/message/message.routes';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { PaymentRoutes } from '../modules/payment/payment.routes';
import { PropertyRoutes } from '../modules/property/property.routes';
import { ReviewRoutes } from '../modules/review/review.routes';
import { TenantRoutes } from '../modules/tenant/tenant.routes';

const routes = express.Router();

const moduleRoutes = [
  // ... routes
  {
    path: '/applications',
    route: ApplicationRoutes,
  },
  {
    path: '/properties',
    route: PropertyRoutes,
  },
  {
    path: '/leases',
    route: LeaseRoutes,
  },
  {
    path: '/tenants',
    route: TenantRoutes,
  },
  {
    path: '/managers',
    route: ManagerRoutes,
  },
  {
    path: '/reviews',
    route: ReviewRoutes,
  },
  {
    path: '/maintenance',
    route: MaintenanceRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/payments',
    route: PaymentRoutes,
  },
];

moduleRoutes.forEach((r) => routes.use(r.path, r.route));
export default routes;
