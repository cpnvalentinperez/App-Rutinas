import type { Pool, PoolConnection } from 'mysql2/promise';
import { z } from 'zod';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
const TIPOS_COMIDA = ['desayuno', 'snack', 'almuerzo', 'merienda', 'cena'] as const;

const PlanComidasSchema = z.object({
  // Se toma como el lunes de la semana a planificar; el resto de los días
  // se calculan a partir de ahí, así "no repetir en los últimos N días" se
  // puede evaluar contra fechas de calendario reales.
  fechaInicio: z.string(),
  dias: z.array(z.enum(DIAS)).min(1),
  comidas: z.array(z.enum(TIPOS_COMIDA)).min(1),
  objetivos: z.array(z.string()).default([]),
  diasEntreno: z.array(z.enum(DIAS)).default([]),
  ventanaDiasSinRepetir: z.number().int().min(0).max(90).default(21),
  notas: z.string().max(255).optional(),
});

function fechaDelDia(fechaInicio: string, dia: (typeof DIAS)[number]): string {
  const idx = DIAS.indexOf(dia);
  const base = new Date(`${fechaInicio}T00:00:00`);
  base.setDate(base.getDate() + idx);
  return base.toISOString().slice(0, 10);
}

function restarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

type Candidata = { id: number; nombre: string };

// Prioriza recetas que matcheen alguno de los objetivos pedidos; si no hay
// ninguna disponible con esos objetivos, cae al pool general del tipo de
// comida. En ambos casos excluye lo ya usado en este plan y lo usado dentro
// de la ventana de días sin repetir, y de los candidatos empatados como
// "hace más tiempo que no se usan" elige al azar para variar entre corridas.
async function seleccionarReceta(
  conn: PoolConnection,
  tiposComida: string[],
  objetivos: string[],
  usadosEnPlan: Set<number>,
  fechaLimiteRepeticion: string
): Promise<Candidata | null> {
  const excluidos = usadosEnPlan.size > 0 ? [...usadosEnPlan] : [0];

  const buscar = async (conObjetivo: boolean): Promise<Candidata[]> => {
    const joinObjetivo = conObjetivo
      ? `JOIN receta_objetivos ro ON ro.receta_id = r.id
         JOIN objetivos_comida o ON o.id = ro.objetivo_id AND o.nombre IN (?)`
      : '';
    const params: any[] = conObjetivo
      ? [objetivos, tiposComida, excluidos, fechaLimiteRepeticion]
      : [tiposComida, excluidos, fechaLimiteRepeticion];

    const [rows] = await conn.query(
      `SELECT r.id, r.nombre, MAX(ru.fecha) as ultimo_uso
       FROM recetas r
       ${joinObjetivo}
       LEFT JOIN receta_usos ru ON ru.receta_id = r.id
       WHERE r.tipo_comida IN (?) AND r.id NOT IN (?)
       GROUP BY r.id, r.nombre
       HAVING ultimo_uso IS NULL OR ultimo_uso < ?
       ORDER BY (ultimo_uso IS NULL) DESC, ultimo_uso ASC
       LIMIT 8`,
      params
    );
    return rows as Candidata[];
  };

  let candidatas = objetivos.length > 0 ? await buscar(true) : [];
  if (candidatas.length === 0) candidatas = await buscar(false);
  if (candidatas.length === 0) return null;

  const topEmpatadas = candidatas.slice(0, 3);
  return topEmpatadas[Math.floor(Math.random() * topEmpatadas.length)];
}

export async function armarPlanComidas(pool: Pool, input: unknown) {
  const data = PlanComidasSchema.parse(input);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [planResult] = await conn.execute(`INSERT INTO planes_comida (fecha_inicio, notas) VALUES (?, ?)`, [
      data.fechaInicio,
      data.notas ?? null,
    ]);
    const planId = (planResult as any).insertId;

    const usadosEnPlan = new Set<number>();
    const sinAsignar: { dia: string; tipoComida: string }[] = [];

    for (const dia of data.dias) {
      const fechaDia = fechaDelDia(data.fechaInicio, dia);
      const fechaLimite = restarDias(fechaDia, data.ventanaDiasSinRepetir);

      for (const tipoComida of data.comidas) {
        const esSnackPostEntreno = tipoComida === 'snack' && data.diasEntreno.includes(dia);
        // La merienda comparte pool con snack mientras la biblioteca de
        // meriendas específicas todavía es chica.
        const tiposEfectivos = tipoComida === 'merienda' ? ['merienda', 'snack'] : [tipoComida];
        const objetivosSlot = esSnackPostEntreno ? [...data.objetivos, 'recuperacion'] : data.objetivos;

        const elegida = await seleccionarReceta(conn, tiposEfectivos, objetivosSlot, usadosEnPlan, fechaLimite);
        if (!elegida) {
          sinAsignar.push({ dia, tipoComida });
          continue;
        }

        usadosEnPlan.add(elegida.id);
        await conn.execute(
          `INSERT INTO plan_comidas (plan_id, dia_semana, tipo_comida, receta_id) VALUES (?, ?, ?, ?)`,
          [planId, dia, tipoComida, elegida.id]
        );
        await conn.execute(`INSERT INTO receta_usos (receta_id, fecha) VALUES (?, ?)`, [elegida.id, fechaDia]);
      }
    }

    await conn.commit();
    return { planId, sinAsignar };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
