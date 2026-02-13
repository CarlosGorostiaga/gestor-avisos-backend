import pg from 'pg';
const { Pool } = pg;

// Construir connection string desde variables de entorno
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Railway requiere SSL
  },
});

// Test conexión
pool.on('connect', () => {
  console.log(`✅ Conectado a Railway PostgreSQL (${process.env.DB_NAME})`);
});

pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL:', err);
});