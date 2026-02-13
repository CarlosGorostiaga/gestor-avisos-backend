import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './database.js';
import { setupRoutes } from './apiRest.js';
import { webhookRouter } from './routers/webhook.routers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configurado para múltiples orígenes
const allowedOrigins = [
  process.env.FRONTEND_URL_LOCAL || 'http://localhost:4321',
  process.env.FRONTEND_URL_PROD || 'https://nadir-agenda.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Origen rechazado: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Preflight requests
app.options('*', cors());

// Webhooks ANTES de JSON parser (necesitan raw body)
app.use('/webhook', webhookRouter);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
setupRoutes(app);

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error no controlado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Iniciar servidor
async function start() {
  try {
    // Test conexión a DB
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a base de datos OK');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
🚀 Servidor corriendo en http://localhost:${PORT}
📊 Entorno: ${process.env.NODE_ENV || 'development'}
🔗 Frontend Local: ${process.env.FRONTEND_URL_LOCAL}
🔗 Frontend Prod: ${process.env.FRONTEND_URL_PROD}
🌐 CORS: Habilitado para ${allowedOrigins.length} orígenes
🗄️  Base de datos: ${process.env.DB_NAME}@${process.env.DB_HOST}
      `);
    });
  } catch (err) {
    console.error('❌ Error al iniciar servidor:', err);
    process.exit(1);
  }
}

start();