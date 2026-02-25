import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
/* ROUTE IMPORT */
import routes from './app/v1/routes';
import { config } from './config/index.config';
import { initializeScheduledJobs } from './lib/scheduledJobs';

/* CONFIGURATIONS */
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

/* ROUTES */
app.get('/', (req, res) => {
  res.send('Hola, amigo! Como Estas? Esta Bien??');
});

app.use('/api/v1', routes);

/* SERVER */
app.listen(config.port, '0.0.0.0', () => {
  console.info(`Server running on port http://localhost:${config.port}`);
  
  // Initialize scheduled jobs in production
  if (config.env === 'production') {
    initializeScheduledJobs();
  }
});
