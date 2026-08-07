import { z } from 'zod';
import { pool } from './db.js'; // tu pool mysql2 existente

// ── Validación de entrada ──────────────────────────────────

const FaseSchema = z.object({
  fase: z.enum(['movilidad', 'activacion', 'potencia', 'fuerza', 'accesorios', 'core', 'finisher']),
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

    // UPSERT atómico apoyado en el UNIQUE KEY (bloque_id, dia_semana):
    // si ya existe una sesión para ese bloque + día, MySQL la actualiza en vez
    // de insertar una fila nueva, así que dos requests concurrentes para el
    // mismo bloque+día no pueden producir duplicados (a diferencia del viejo
    // patrón SELECT→DELETE→INSERT, que sí era vulnerable a esa carrera).
    const [sesionResult] = await conn.execute(
      `INSERT INTO sesiones (bloque_id, dia_semana, nombre, duracion_estimada_min)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id),
         nombre = VALUES(nombre),
         duracion_estimada_min = VALUES(duracion_estimada_min)`,
      [data.bloqueId, data.diaSemana, data.nombreSesion ?? null, data.duracionEstimadaMin]
    );
    const sesionId = (sesionResult as any).insertId;

    // Si la sesión ya existía, limpiamos sus ejercicios previos antes de recargarla
    await conn.execute(`DELETE FROM sesion_ejercicios WHERE sesion_id = ?`, [sesionId]);

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