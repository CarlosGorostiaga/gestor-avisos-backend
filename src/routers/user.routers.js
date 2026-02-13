import { Router } from 'express';
import { getAccess } from '../controller/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const userRouter = Router();

userRouter.get('/access', requireAuth, getAccess);

export { userRouter };