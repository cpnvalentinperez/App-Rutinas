import type { PoolConnection } from 'mysql2/promise';

export type RecetaInput = {
  nombre: string;
  descripcion?: string;
  tipoComida: 'desayuno' | 'snack' | 'almuerzo' | 'merienda' | 'cena';
  tiempoPrepMin: number;
  porciones: number;
  dificultad: 'facil' | 'media' | 'elaborada';
  caloriasAprox?: number;
  proteinaAproxG?: number;
  carbohidratosG?: number;
  grasasG?: number;
  fibraG?: number;
  vegetariana?: boolean;
  vegana?: boolean;
  sinGluten?: boolean;
  mealPrep?: boolean;
  congelable?: boolean;
  costo?: 'bajo' | 'medio' | 'alto';
  instrucciones: string;
  notas?: string;
  ingredientes: { nombre: string; cantidad?: string }[];
  objetivos?: string[];
  tags?: string[];
};

async function guardarIngredientes(
  conn: PoolConnection,
  recetaId: number,
  ingredientes: RecetaInput['ingredientes']
): Promise<void> {
  for (const ing of ingredientes) {
    await conn.execute(`INSERT IGNORE INTO ingredientes_comida (nombre) VALUES (?)`, [ing.nombre]);
    const [ingRows] = await conn.execute(`SELECT id FROM ingredientes_comida WHERE nombre = ?`, [ing.nombre]);
    const ingredienteId = (ingRows as any[])[0].id;

    await conn.execute(
      `INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad) VALUES (?, ?, ?)`,
      [recetaId, ingredienteId, ing.cantidad ?? null]
    );
  }
}

// Objetivos y tags son catálogos dinámicos (igual que ingredientes_comida):
// si el nombre no existe todavía se crea sobre la marcha.
async function guardarCatalogoSimple(
  conn: PoolConnection,
  tablaCatalogo: 'objetivos_comida' | 'tags_comida',
  tablaRelacion: 'receta_objetivos' | 'receta_tags',
  columnaRelacion: 'objetivo_id' | 'tag_id',
  recetaId: number,
  nombres: string[]
): Promise<void> {
  for (const nombre of nombres) {
    await conn.execute(`INSERT IGNORE INTO ${tablaCatalogo} (nombre) VALUES (?)`, [nombre]);
    const [rows] = await conn.execute(`SELECT id FROM ${tablaCatalogo} WHERE nombre = ?`, [nombre]);
    const catalogoId = (rows as any[])[0].id;
    await conn.execute(`INSERT IGNORE INTO ${tablaRelacion} (receta_id, ${columnaRelacion}) VALUES (?, ?)`, [
      recetaId,
      catalogoId,
    ]);
  }
}

const guardarObjetivos = (conn: PoolConnection, recetaId: number, objetivos: string[]) =>
  guardarCatalogoSimple(conn, 'objetivos_comida', 'receta_objetivos', 'objetivo_id', recetaId, objetivos);

const guardarTags = (conn: PoolConnection, recetaId: number, tags: string[]) =>
  guardarCatalogoSimple(conn, 'tags_comida', 'receta_tags', 'tag_id', recetaId, tags);

export async function crearReceta(conn: PoolConnection, data: RecetaInput): Promise<number> {
  const [result] = await conn.execute(
    `INSERT INTO recetas
       (nombre, descripcion, tipo_comida, tiempo_prep_min, porciones, dificultad,
        calorias_aprox, proteina_aprox_g, carbohidratos_g, grasas_g, fibra_g,
        vegetariana, vegana, sin_gluten, meal_prep, congelable, costo, instrucciones, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.descripcion ?? null,
      data.tipoComida,
      data.tiempoPrepMin,
      data.porciones,
      data.dificultad,
      data.caloriasAprox ?? null,
      data.proteinaAproxG ?? null,
      data.carbohidratosG ?? null,
      data.grasasG ?? null,
      data.fibraG ?? null,
      data.vegetariana ?? false,
      data.vegana ?? false,
      data.sinGluten ?? false,
      data.mealPrep ?? false,
      data.congelable ?? false,
      data.costo ?? 'medio',
      data.instrucciones,
      data.notas ?? null,
    ]
  );
  const recetaId = (result as any).insertId;
  await guardarIngredientes(conn, recetaId, data.ingredientes);
  await guardarObjetivos(conn, recetaId, data.objetivos ?? []);
  await guardarTags(conn, recetaId, data.tags ?? []);
  return recetaId;
}

export async function actualizarReceta(conn: PoolConnection, id: number, data: RecetaInput): Promise<void> {
  await conn.execute(
    `UPDATE recetas
     SET nombre = ?, descripcion = ?, tipo_comida = ?, tiempo_prep_min = ?, porciones = ?, dificultad = ?,
         calorias_aprox = ?, proteina_aprox_g = ?, carbohidratos_g = ?, grasas_g = ?, fibra_g = ?,
         vegetariana = ?, vegana = ?, sin_gluten = ?, meal_prep = ?, congelable = ?, costo = ?,
         instrucciones = ?, notas = ?
     WHERE id = ?`,
    [
      data.nombre,
      data.descripcion ?? null,
      data.tipoComida,
      data.tiempoPrepMin,
      data.porciones,
      data.dificultad,
      data.caloriasAprox ?? null,
      data.proteinaAproxG ?? null,
      data.carbohidratosG ?? null,
      data.grasasG ?? null,
      data.fibraG ?? null,
      data.vegetariana ?? false,
      data.vegana ?? false,
      data.sinGluten ?? false,
      data.mealPrep ?? false,
      data.congelable ?? false,
      data.costo ?? 'medio',
      data.instrucciones,
      data.notas ?? null,
      id,
    ]
  );
  await conn.execute(`DELETE FROM receta_ingredientes WHERE receta_id = ?`, [id]);
  await guardarIngredientes(conn, id, data.ingredientes);
  await conn.execute(`DELETE FROM receta_objetivos WHERE receta_id = ?`, [id]);
  await guardarObjetivos(conn, id, data.objetivos ?? []);
  await conn.execute(`DELETE FROM receta_tags WHERE receta_id = ?`, [id]);
  await guardarTags(conn, id, data.tags ?? []);
}
