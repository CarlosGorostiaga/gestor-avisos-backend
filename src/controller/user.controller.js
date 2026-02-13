import { pool } from '../database.js';

// GET /user/access
async function getAccess(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
        plan, 
        access_until, 
        stripe_customer_id,
        updated_at,
        CASE 
          WHEN access_until > NOW() THEN true
          ELSE false
        END as has_access,
        EXTRACT(EPOCH FROM (access_until - NOW())) / 86400 as days_remaining
      FROM user_access 
      WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acceso no encontrado' });
    }

    res.json({ access: result.rows[0] });

  } catch (err) {
    console.error('Error en getAccess:', err);
    res.status(500).json({ error: 'Error al obtener acceso' });
  }
}

export { getAccess };