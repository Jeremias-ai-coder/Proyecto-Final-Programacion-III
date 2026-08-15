import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import businessRoutes from './routes/business.routes';
import appointmentRoutes from './routes/appointment.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/admin', adminRoutes);

// Global error handler (RFC 7807)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
