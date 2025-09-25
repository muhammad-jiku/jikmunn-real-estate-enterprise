import express from 'express';
import { ApplicationRoutes } from '../modules/application/application.routes';
import { LeaseRoutes } from '../modules/lease/lease.routes';
import { ManagerRoutes } from '../modules/manager/manager.routes';
import { PropertyRoutes } from '../modules/property/property.routes';
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
];

moduleRoutes.forEach((r) => routes.use(r.path, r.route));
export default routes;
