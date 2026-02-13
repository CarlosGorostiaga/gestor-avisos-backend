import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../database.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';

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
    
    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, verified, verification_token) 
       VALUES ($1, $2, false, $3) 
       RETURNING id, email, created_at`,
      [email.toLowerCase().trim(), passwordHash, verificationToken]
    );

    const user = userResult.rows[0];

    // Crear acceso trial de 30 días (aunque no podrá usarlo hasta verificar)
    const accessUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    await client.query(
      'INSERT INTO user_access (user_id, plan, access_until) VALUES ($1, $2, $3)',
      [user.id, 'trial', accessUntil]
    );

    await client.query('COMMIT');

    // Enviar email de verificación
    const emailSent = await sendVerificationEmail(user.email, verificationToken);

    if (!emailSent) {
      console.warn('⚠️ No se pudo enviar el email de verificación');
    }

    res.status(201).json({
      message: 'Cuenta creada. Revisa tu email para verificar tu cuenta.',
      email: user.email,
      requiresVerification: true,
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
      'SELECT id, email, password_hash, verified FROM users WHERE email = $1',
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

    // Verificar que el email esté verificado
    if (!user.verified) {
      return res.status(403).json({ 
        error: 'Email no verificado. Revisa tu bandeja de entrada.',
        requiresVerification: true,
        email: user.email,
      });
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
      'SELECT id, email, verified, created_at FROM users WHERE id = $1',
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

// POST /auth/verify-email
async function verifyEmail(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token requerido' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const user = result.rows[0];

    await pool.query(
      'UPDATE users SET verified = true, verification_token = NULL WHERE id = $1',
      [user.id]
    );

    // Generar token JWT para login automático
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Email verificado correctamente',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
      },
    });

  } catch (err) {
    console.error('Error en verifyEmail:', err);
    res.status(500).json({ error: 'Error al verificar email' });
  }
}

// POST /auth/forgot-password
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Siempre responder lo mismo (por seguridad)
    if (result.rows.length === 0) {
      return res.json({ 
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' 
      });
    }

    const user = result.rows[0];

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Enviar email
    await sendPasswordResetEmail(user.email, resetToken);

    res.json({ 
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' 
    });

  } catch (err) {
    console.error('Error en forgotPassword:', err);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
}

// POST /auth/reset-password
async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const user = result.rows[0];

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });

  } catch (err) {
    console.error('Error en resetPassword:', err);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
}

// POST /auth/resend-verification
async function resendVerification(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, verified, verification_token FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'Si el email existe, se ha reenviado el correo de verificación' });
    }

    const user = result.rows[0];

    if (user.verified) {
      return res.status(400).json({ error: 'Este email ya está verificado' });
    }

    // Generar nuevo token si no existe
    let token = user.verification_token;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'UPDATE users SET verification_token = $1 WHERE id = $2',
        [token, user.id]
      );
    }

    await sendVerificationEmail(user.email, token);

    res.json({ message: 'Si el email existe, se ha reenviado el correo de verificación' });

  } catch (err) {
    console.error('Error en resendVerification:', err);
    res.status(500).json({ error: 'Error al reenviar verificación' });
  }
}

export { register, login, me, verifyEmail, forgotPassword, resetPassword, resendVerification };