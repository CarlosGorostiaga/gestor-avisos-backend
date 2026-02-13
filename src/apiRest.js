import { authRouter } from './routers/auth.routers.js';
import { userRouter } from './routers/user.routers.js';
import { webhookRouter } from './routers/webhook.routers.js';

function setupRoutes(app) {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Test CORS
  app.get('/test-cors', (req, res) => {
    res.json({
      message: 'CORS funcionando correctamente',
      origin: req.headers.origin || 'Sin origin',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/auth', authRouter);
  app.use('/user', userRouter);
  app.use('/webhook', webhookRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });
}

export { setupRoutes };