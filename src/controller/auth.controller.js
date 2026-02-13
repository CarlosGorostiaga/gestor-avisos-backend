import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database.js';

// POST /auth/register
async function register(req, res) {
  const { email, password } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase().trim(), passwordHash]
    );

    const user = userResult.rows[0];

    // Crear acceso trial de 30 días
    const accessUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    await client.query(
      'INSERT INTO user_access (user_id, plan, access_until) VALUES ($1, $2, $3)',
      [user.id, 'trial', accessUntil]
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Usuario creado correctamente',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });

  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    console.error('Error en register:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  } finally {
    client.release();
  }
}

// POST /auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

// GET /auth/me
async function me(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error('Error en me:', err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

// Exportar todas las funciones
export { register, login, me };