import type { PoolConnection } from 'mysql2/promise';

export type RecetaInput = {
  nombre: string;
  tipoComida: 'desayuno' | 'almuerzo' | 'cena' | 'snack';
  tiempoPrepMin: number;
  porciones: number;
  dificultad: 'facil' | 'media';
  caloriasAprox?: number;
  proteinaAproxG?: number;
  instrucciones: string;
  notas?: string;
  ingredientes: { nombre: string; cantidad?: string }[];
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

export async function crearReceta(conn: PoolConnection, data: RecetaInput): Promise<number> {
  const [result] = await conn.execute(
    `INSERT INTO recetas
       (nombre, tipo_comida, tiempo_prep_min, porciones, dificultad, calorias_aprox, proteina_aprox_g, instrucciones, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.tipoComida,
      data.tiempoPrepMin,
      data.porciones,
      data.dificultad,
      data.caloriasAprox ?? null,
      data.proteinaAproxG ?? null,
      data.instrucciones,
      data.notas ?? null,
    ]
  );
  const recetaId = (result as any).insertId;
  await guardarIngredientes(conn, recetaId, data.ingredientes);
  return recetaId;
}

export async function actualizarReceta(conn: PoolConnection, id: number, data: RecetaInput): Promise<void> {
  await conn.execute(
    `UPDATE recetas
     SET nombre = ?, tipo_comida = ?, tiempo_prep_min = ?, porciones = ?, dificultad = ?,
         calorias_aprox = ?, proteina_aprox_g = ?, instrucciones = ?, notas = ?
     WHERE id = ?`,
    [
      data.nombre,
      data.tipoComida,
      data.tiempoPrepMin,
      data.porciones,
      data.dificultad,
      data.caloriasAprox ?? null,
      data.proteinaAproxG ?? null,
      data.instrucciones,
      data.notas ?? null,
      id,
    ]
  );
  await conn.execute(`DELETE FROM receta_ingredientes WHERE receta_id = ?`, [id]);
  await guardarIngredientes(conn, id, data.ingredientes);
}
