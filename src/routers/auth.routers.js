import { Router } from 'express';
import { 
  register, 
  login, 
  me, 
  verifyEmail, 
  forgotPassword, 
  resetPassword,
  resendVerification 
} from '../controller/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const authRouter = Router();

// Rutas públicas
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/resend-verification', resendVerification);

// Rutas protegidas
authRouter.get('/me', requireAuth, me);

export { authRouter };