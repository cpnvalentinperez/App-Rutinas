import { pool } from '../src/db.js'; // o la ruta que corresponda en tu proyecto

export default async function handler(req: any, res: any) {
  // Protección simple para que nadie más lo dispare por accidente
  if (req.query.clave !== 'borrar-lunes-2026') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.execute(`DELETE FROM sesion_ejercicios WHERE sesion_id IN (27, 28, 29)`);
    await conn.execute(`DELETE FROM sesiones WHERE id IN (27, 28, 29)`);
    res.json({ ok: true, mensaje: 'Sesiones duplicadas borradas' });
  } finally {
    conn.release();
  }
}