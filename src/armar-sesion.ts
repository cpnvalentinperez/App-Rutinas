import { z } from 'zod';
import { pool } from '../db'; // tu pool mysql2 existente

// ── Validación de entrada ──────────────────────────────────

const FaseSchema = z.object({
  fase: z.enum(['activacion', 'potencia', 'fuerza', 'accesorios', 'core', 'finisher']),
  patron: z.enum([
    'empuje', 'tiron', 'rodilla', 'cadera', 'core', 'rotacion',
    'potencia', 'aceleracion', 'desaceleracion', 'estabilidad', 'movilidad',
  ]),
  cantidad: z.number().int().min(1).max(6),
  metodo: z
    .enum(['tradicional', 'superserie', 'circuito', 'emom', 'amrap', 'contraste', 'complejo'])
    .default('tradicional'),
  series: z.number().int().optional(),
  reps: z.string().max(20).optional(),
  descansoSeg: z.number().int().optional(),
});

const ArmarSesionSchema = z.object({
  bloqueId: z.number().int(),
  diaSemana: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
  nombreSesion: z.string().max(120).optional(),
  duracionEstimadaMin: z.number().int().default(40),
  fases: z.array(FaseSchema).min(1),
});

type FaseInput = z.infer<typeof FaseSchema>;
type Ejercicio = { id: number; nombre: string; veces_usado: number };

// ── Selección de ejercicios dentro de un patrón ────────────
// Prioriza los menos usados, pero elige al azar entre los "empatados"
// para no repetir siempre el mismo ejercicio con menor conteo.

async function seleccionarEjercicios(
  conn: any,
  patron: string,
  cantidad: number
): Promise<Ejercicio[]> {
  const [rows] = await conn.execute(
    `SELECT id, nombre, veces_usado FROM ejercicios
     WHERE patron_movimiento = ? AND activo = TRUE
     ORDER BY veces_usado ASC
     LIMIT 8`,
    [patron]
  );

  const candidatos = rows as Ejercicio[];
  if (candidatos.length === 0) {
    throw new Error(`No hay ejercicios activos para el patrón "${patron}"`);
  }

  const minUso = candidatos[0].veces_usado;
  const menosUsados = candidatos.filter((e) => e.veces_usado <= minUso + 1);

  const elegidos: Ejercicio[] = [];
  const disponibles = [...menosUsados];
  while (elegidos.length < cantidad && disponibles.length > 0) {
    const idx = Math.floor(Math.random() * disponibles.length);
    elegidos.push(disponibles.splice(idx, 1)[0]);
  }

  // Si el pool de "menos usados" no alcanza, completamos con el resto
  if (elegidos.length < cantidad) {
    const yaElegidosIds = new Set(elegidos.map((e) => e.id));
    const restantes = candidatos.filter((e) => !yaElegidosIds.has(e.id));
    elegidos.push(...restantes.slice(0, cantidad - elegidos.length));
  }

  return elegidos;
}

// ── Armado de la sesión completa ───────────────────────────

export async function armarSesion(input: unknown) {
  const data = ArmarSesionSchema.parse(input);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Si ya existe una sesión para este bloque + día, la reemplazamos
    // en vez de crear una nueva (evita duplicados como el de "lunes" x4)
    const [existentes] = await conn.execute(
      `SELECT id FROM sesiones WHERE bloque_id = ? AND dia_semana = ?`,
      [data.bloqueId, data.diaSemana]
    );
    if ((existentes as any[]).length > 0) {
      const idExistente = (existentes as any[])[0].id;
      await conn.execute(`DELETE FROM sesion_ejercicios WHERE sesion_id = ?`, [idExistente]);
      await conn.execute(`DELETE FROM sesiones WHERE id = ?`, [idExistente]);
    }

    const [sesionResult] = await conn.execute(
      `INSERT INTO sesiones (bloque_id, dia_semana, nombre, duracion_estimada_min)
       VALUES (?, ?, ?, ?)`,
      [data.bloqueId, data.diaSemana, data.nombreSesion ?? null, data.duracionEstimadaMin]
    );
    const sesionId = (sesionResult as any).insertId;

    let orden = 1;
    for (const fase of data.fases as FaseInput[]) {
      const elegidos = await seleccionarEjercicios(conn, fase.patron, fase.cantidad);

      for (const ejercicio of elegidos) {
        await conn.execute(
          `INSERT INTO sesion_ejercicios
             (sesion_id, ejercicio_id, fase, orden, metodo, series, reps, descanso_seg)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sesionId,
            ejercicio.id,
            fase.fase,
            orden++,
            fase.metodo,
            fase.series ?? null,
            fase.reps ?? null,
            fase.descansoSeg ?? null,
          ]
        );

        await conn.execute(`UPDATE ejercicios SET veces_usado = veces_usado + 1 WHERE id = ?`, [
          ejercicio.id,
        ]);
      }
    }

    await conn.commit();
    return { sesionId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}