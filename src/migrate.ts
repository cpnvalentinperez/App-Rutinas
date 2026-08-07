import type { Pool, PoolConnection } from 'mysql2/promise';

async function columnaExiste(conn: PoolConnection, tabla: string, columna: string): Promise<boolean> {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabla, columna]
  );
  return (rows as any[])[0].cnt > 0;
}

async function agregarColumnaSiNoExiste(
  conn: PoolConnection,
  tabla: string,
  columna: string,
  definicionSQL: string
): Promise<void> {
  if (await columnaExiste(conn, tabla, columna)) return;
  await conn.execute(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicionSQL}`);
  console.log(`[migrate] agregada columna ${tabla}.${columna}`);
}

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

    // Suma "movilidad" como fase propia (antes solo existía como patrón de
    // movimiento, y quedaba mezclada dentro de "activacion"). No se saca
    // "accesorios" para no romper filas viejas que ya la usan.
    const [[faseCol]] = (await conn.execute(
      `SELECT COLUMN_TYPE as tipo FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sesion_ejercicios' AND COLUMN_NAME = 'fase'`
    )) as any[];
    if (faseCol && !faseCol.tipo.includes("'movilidad'")) {
      await conn.execute(
        `ALTER TABLE sesion_ejercicios
         MODIFY COLUMN fase ENUM('movilidad','activacion','potencia','fuerza','accesorios','core','finisher') NOT NULL`
      );
      console.log('[migrate] agregada fase "movilidad" al enum de sesion_ejercicios');
    }

    // ── Recetas v2: metadata rica + selector de plan semanal ──────────
    // Mismo criterio que con los ejercicios: la IA no inventa comidas,
    // arma el plan eligiendo entre recetas ya cargadas con esta metadata.

    await agregarColumnaSiNoExiste(conn, 'recetas', 'descripcion', 'VARCHAR(255) NULL AFTER nombre');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'carbohidratos_g', 'SMALLINT NULL AFTER proteina_aprox_g');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'grasas_g', 'SMALLINT NULL AFTER carbohidratos_g');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'fibra_g', 'SMALLINT NULL AFTER grasas_g');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'vegetariana', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'vegana', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'sin_gluten', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'meal_prep', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'congelable', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await agregarColumnaSiNoExiste(conn, 'recetas', 'costo', "ENUM('bajo','medio','alto') NOT NULL DEFAULT 'medio'");

    const [[dificultadCol]] = (await conn.execute(
      `SELECT COLUMN_TYPE as tipo FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recetas' AND COLUMN_NAME = 'dificultad'`
    )) as any[];
    if (dificultadCol && !dificultadCol.tipo.includes("'elaborada'")) {
      await conn.execute(
        `ALTER TABLE recetas MODIFY COLUMN dificultad ENUM('facil','media','elaborada') NOT NULL DEFAULT 'facil'`
      );
      console.log('[migrate] agregada dificultad "elaborada" a recetas');
    }

    const [[tipoComidaCol]] = (await conn.execute(
      `SELECT COLUMN_TYPE as tipo FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recetas' AND COLUMN_NAME = 'tipo_comida'`
    )) as any[];
    if (tipoComidaCol && !tipoComidaCol.tipo.includes("'merienda'")) {
      await conn.execute(
        `ALTER TABLE recetas MODIFY COLUMN tipo_comida ENUM('desayuno','snack','almuerzo','merienda','cena') NOT NULL`
      );
      console.log('[migrate] agregado tipo_comida "merienda" a recetas');
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS objetivos_comida (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS receta_objetivos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receta_id INT NOT NULL,
        objetivo_id INT NOT NULL,
        FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
        FOREIGN KEY (objetivo_id) REFERENCES objetivos_comida(id) ON DELETE CASCADE,
        UNIQUE KEY uq_receta_objetivo (receta_id, objetivo_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tags_comida (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS receta_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receta_id INT NOT NULL,
        tag_id INT NOT NULL,
        FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags_comida(id) ON DELETE CASCADE,
        UNIQUE KEY uq_receta_tag (receta_id, tag_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS receta_usos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receta_id INT NOT NULL,
        fecha DATE NOT NULL,
        FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
        INDEX idx_receta_fecha (receta_id, fecha)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS planes_comida (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha_inicio DATE NOT NULL,
        notas VARCHAR(255) NULL,
        fecha_creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS plan_comidas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL,
        dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
        tipo_comida ENUM('desayuno','snack','almuerzo','merienda','cena') NOT NULL,
        receta_id INT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES planes_comida(id) ON DELETE CASCADE,
        FOREIGN KEY (receta_id) REFERENCES recetas(id),
        UNIQUE KEY uq_plan_dia_tipo (plan_id, dia_semana, tipo_comida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } finally {
    conn.release();
  }
}
