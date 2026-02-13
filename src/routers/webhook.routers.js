import { Router } from 'express';
import express from 'express';
import { handleStripe } from '../controller/webhook.controller.js';

const webhookRouter = Router();

// RAW body para validar signature de Stripe
webhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripe
);

export { webhookRouter };