import type { Pool } from 'mysql2/promise';

// Corre automáticamente al arrancar el server (ver app.ts). Es idempotente:
// en cada cold start vuelve a chequear, pero solo actúa si hace falta, así
// que no cuesta nada dejarla siempre activa.
export async function runMigrations(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS recetas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        tipo_comida ENUM('desayuno','almuerzo','cena','snack') NOT NULL,
        tiempo_prep_min TINYINT NOT NULL,
        porciones TINYINT NOT NULL DEFAULT 1,
        dificultad ENUM('facil','media') NOT NULL DEFAULT 'facil',
        calorias_aprox SMALLINT NULL,
        proteina_aprox_g SMALLINT NULL,
        instrucciones TEXT NOT NULL,
        notas VARCHAR(255) NULL,
        INDEX idx_tipo_comida (tipo_comida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ingredientes_comida (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS receta_ingredientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receta_id INT NOT NULL,
        ingrediente_id INT NOT NULL,
        cantidad VARCHAR(40) NULL,
        FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
        FOREIGN KEY (ingrediente_id) REFERENCES ingredientes_comida(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [dupGroups] = await conn.execute(
      `SELECT bloque_id, dia_semana, COUNT(*) as cnt
       FROM sesiones
       GROUP BY bloque_id, dia_semana
       HAVING COUNT(*) > 1`
    );

    for (const g of dupGroups as any[]) {
      const [rows] = await conn.execute(
        `SELECT id FROM sesiones WHERE bloque_id = ? AND dia_semana = ? ORDER BY id ASC`,
        [g.bloque_id, g.dia_semana]
      );
      const ids = (rows as any[]).map((r) => r.id);
      const idsABorrar = ids.slice(1);

      for (const id of idsABorrar) {
        await conn.execute(`DELETE FROM sesion_ejercicios WHERE sesion_id = ?`, [id]);
        await conn.execute(`DELETE FROM sesiones WHERE id = ?`, [id]);
      }

      console.log(
        `[migrate] bloque ${g.bloque_id} / ${g.dia_semana}: eliminados ${idsABorrar.length} duplicados (conservado id ${ids[0]})`
      );
    }

    const [existing] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sesiones' AND INDEX_NAME = 'uq_bloque_dia'`
    );
    if ((existing as any[])[0].cnt === 0) {
      await conn.execute(
        `ALTER TABLE sesiones ADD UNIQUE KEY uq_bloque_dia (bloque_id, dia_semana)`
      );
      console.log('[migrate] agregado UNIQUE KEY uq_bloque_dia (bloque_id, dia_semana)');
    }
  } finally {
    conn.release();
  }
}
