import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { authMiddleware } from './middleware/authMiddleware';
import applicationRoutes from './routes/applicationRoutes';
import leaseRoutes from './routes/leaseRoutes';
import managerRoutes from './routes/managerRoutes';
import propertyRoutes from './routes/propertyRoutes';
import tenantRoutes from './routes/tenantRoutes';

dotenv.config();
const app = express();

// Basic middleware
app.use(cors());
app.use(helmet());
app.use(
  helmet.crossOriginResourcePolicy({
    policy: 'cross-origin',
  })
);
app.use(morgan('common'));

// CRITICAL: Only apply body parsing to NON-multipart routes
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // Skip body parsing for multipart/form-data (let multer handle it)
  if (contentType.includes('multipart/form-data')) {
    return next();
  }

  // Apply body parsing for other content types
  bodyParser.json({ limit: '10mb' })(req, res, () => {
    bodyParser.urlencoded({ extended: false, limit: '10mb' })(req, res, next);
  });
});

/* ROUTES */
app.get('/', (req, res) => {
  res.send('Hola, amigo! Como Estas? Esta Bien??');
});

app.use('/applications', applicationRoutes);
app.use('/properties', propertyRoutes);
app.use('/leases', leaseRoutes);
app.use('/tenants', authMiddleware(['tenant']), tenantRoutes);
app.use('/managers', authMiddleware(['manager']), managerRoutes);

const port = Number(process.env.PORT) || 8000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port http://localhost:${port}`);
});
