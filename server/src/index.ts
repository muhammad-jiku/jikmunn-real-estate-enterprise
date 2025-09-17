import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { authMiddleware } from './middleware/authMiddleware';
/* ROUTE IMPORT */
import applicationRoutes from './routes/applicationRoutes';
import leaseRoutes from './routes/leaseRoutes';
import managerRoutes from './routes/managerRoutes';
import propertyRoutes from './routes/propertyRoutes';
import tenantRoutes from './routes/tenantRoutes';

/* CONFIGURATIONS */
dotenv.config();
const app = express();
// app.use(express.json());
// app.use(helmet());
// app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
// app.use(morgan('common'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cors());

// Apply general middleware
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(cors());

// Apply bodyParser only to non-multipart routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ROUTES */
app.get('/', (req, res) => {
  res.send('Hola, amigo! Como Estas? Esta Bien??');
});

app.use('/applications', applicationRoutes);
// app.use('/properties', propertyRoutes);
app.use('/leases', leaseRoutes);
app.use('/tenants', authMiddleware(['tenant']), tenantRoutes);
app.use('/managers', authMiddleware(['manager']), managerRoutes);

// Property routes handle their own multipart parsing
app.use('/properties', propertyRoutes);

/* SERVER */
const port = Number(process.env.PORT) || 8000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port http://localhost:${port}`);
});
