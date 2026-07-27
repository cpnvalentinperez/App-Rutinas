import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import 'dotenv/config';
import { armarSesion } from './armar-sesion.js';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function asyncHandler(fn: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response) => {
    fn(req, res).catch((err: any) => {
      res.status(500).json({ error: err.message ?? 'Error interno' });
    });
  };
}

app.post('/sesiones', async (req, res) => {
  try {
    const resultado = await armarSesion(req.body);
    res.status(201).json(resultado);
  } catch (err: any) {
    // Errores de validación de Zod u otros
    res.status(400).json({ error: err.message ?? 'Error al armar la sesión' });
  }
});

app.get('/sesiones', asyncHandler(async (req, res) => {
  const bloqueId = req.query.bloqueId ? Number(req.query.bloqueId) : undefined;
  const [sesiones] = (await (bloqueId
    ? pool.execute('SELECT * FROM sesiones WHERE bloque_id = ? ORDER BY id', [bloqueId])
    : pool.query('SELECT * FROM sesiones ORDER BY id DESC LIMIT 50'))) as any;

  if (!bloqueId || sesiones.length === 0) {
    res.json(sesiones);
    return;
  }

  const [ejercicios] = (await pool.query(
    `SELECT se.id AS sesion_ejercicio_id, se.sesion_id, se.orden, se.fase, se.metodo,
            e.id AS ejercicio_id, e.nombre, e.patron_movimiento, e.notas, e.video_url
     FROM sesion_ejercicios se
     JOIN ejercicios e ON e.id = se.ejercicio_id
     WHERE se.sesion_id IN (?)
     ORDER BY se.orden`,
    [sesiones.map((s: any) => s.id)]
  )) as any;

  const ejerciciosPorSesion = new Map<number, any[]>();
  for (const ej of ejercicios) {
    const lista = ejerciciosPorSesion.get(ej.sesion_id) ?? [];
    lista.push(ej);
    ejerciciosPorSesion.set(ej.sesion_id, lista);
  }

  res.json(sesiones.map((s: any) => ({ ...s, ejercicios: ejerciciosPorSesion.get(s.id) ?? [] })));
}));

app.get('/sesiones/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [sesiones] = (await pool.execute('SELECT * FROM sesiones WHERE id = ?', [id])) as any;
  const sesion = sesiones[0];
  if (!sesion) {
    res.status(404).json({ error: 'Sesión no encontrada' });
    return;
  }

  const [ejercicios] = await pool.execute(
    `SELECT se.id AS sesion_ejercicio_id, se.orden, se.fase, se.metodo, se.series, se.reps, se.descanso_seg,
            e.id AS ejercicio_id, e.nombre, e.patron_movimiento, e.notas, e.video_url
     FROM sesion_ejercicios se
     JOIN ejercicios e ON e.id = se.ejercicio_id
     WHERE se.sesion_id = ?
     ORDER BY se.orden`,
    [id]
  );

  res.json({ ...sesion, ejercicios });
}));

app.delete('/sesiones/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [result] = (await pool.execute('DELETE FROM sesiones WHERE id = ?', [id])) as any;
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Sesión no encontrada' });
    return;
  }
  res.json({ ok: true });
}));

app.get('/ejercicios', asyncHandler(async (req, res) => {
  const patron = typeof req.query.patron === 'string' ? req.query.patron : undefined;
  const [rows] = patron
    ? await pool.execute(
        'SELECT id, nombre, patron_movimiento FROM ejercicios WHERE patron_movimiento = ? AND activo = TRUE ORDER BY nombre',
        [patron]
      )
    : await pool.query(
        'SELECT id, nombre, patron_movimiento FROM ejercicios WHERE activo = TRUE ORDER BY patron_movimiento, nombre'
      );
  res.json(rows);
}));

app.patch('/sesion-ejercicios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const nuevoEjercicioId = Number(req.body.ejercicioId);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [actualRows] = (await conn.execute(
      'SELECT se.ejercicio_id, e.patron_movimiento FROM sesion_ejercicios se JOIN ejercicios e ON e.id = se.ejercicio_id WHERE se.id = ?',
      [id]
    )) as any;
    const actual = actualRows[0];
    if (!actual) {
      await conn.rollback();
      res.status(404).json({ error: 'Ejercicio de sesión no encontrado' });
      return;
    }

    const [nuevoRows] = (await conn.execute(
      'SELECT id FROM ejercicios WHERE id = ? AND patron_movimiento = ? AND activo = TRUE',
      [nuevoEjercicioId, actual.patron_movimiento]
    )) as any;
    if (!nuevoRows[0]) {
      await conn.rollback();
      res.status(400).json({ error: `El ejercicio elegido no pertenece al patrón "${actual.patron_movimiento}"` });
      return;
    }

    await conn.execute('UPDATE sesion_ejercicios SET ejercicio_id = ? WHERE id = ?', [nuevoEjercicioId, id]);
    await conn.execute('UPDATE ejercicios SET veces_usado = veces_usado + 1 WHERE id = ?', [nuevoEjercicioId]);
    await conn.execute('UPDATE ejercicios SET veces_usado = GREATEST(veces_usado - 1, 0) WHERE id = ?', [
      actual.ejercicio_id,
    ]);

    await conn.commit();
    res.json({ ok: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(400).json({ error: err.message ?? 'Error al cambiar el ejercicio' });
  } finally {
    conn.release();
  }
});

const BloqueSchema = z.object({
  nombre: z.string().min(1).max(120),
  foco: z.enum(['potencia', 'fuerza', 'hipertrofia_funcional', 'deload']),
  fechaInicio: z.string(),
  duracionSemanas: z.number().int().min(1).max(52),
  notas: z.string().max(255).optional(),
});

app.get('/bloques', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM bloques ORDER BY id DESC');
  res.json(rows);
}));

app.post('/bloques', async (req, res) => {
  try {
    const data = BloqueSchema.parse(req.body);
    const [result] = await pool.execute(
      `INSERT INTO bloques (nombre, foco, fecha_inicio, fecha_fin, duracion_semanas, notas)
       VALUES (?, ?, ?, DATE_ADD(?, INTERVAL ? WEEK), ?, ?)`,
      [
        data.nombre,
        data.foco,
        data.fechaInicio,
        data.fechaInicio,
        data.duracionSemanas,
        data.duracionSemanas,
        data.notas ?? null,
      ]
    );
    res.status(201).json({ bloqueId: (result as any).insertId });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Error al crear el bloque' });
  }
});

app.delete('/bloques/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [result] = (await pool.execute('DELETE FROM bloques WHERE id = ?', [id])) as any;
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Bloque no encontrado' });
    return;
  }
  res.json({ ok: true });
}));

// Vercel auto-detecta este archivo como entrypoint de servidor y requiere
// que el export default sea la app/función (no alcanza con el named export).
export default app;
