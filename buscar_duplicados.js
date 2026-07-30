// buscar_duplicados.js
import mysql from 'mysql2/promise';
import 'dotenv/config';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

const [dupGroups] = await conn.execute(
  `SELECT bloque_id, dia_semana, COUNT(*) as cnt
   FROM sesiones
   GROUP BY bloque_id, dia_semana
   HAVING COUNT(*) > 1
   ORDER BY bloque_id, dia_semana`
);

console.log('Grupos duplicados (bloque_id, dia_semana, cantidad):');
console.table(dupGroups);

for (const g of dupGroups) {
  const [rows] = await conn.execute(
    `SELECT id, bloque_id, dia_semana, nombre FROM sesiones WHERE bloque_id = ? AND dia_semana = ? ORDER BY id`,
    [g.bloque_id, g.dia_semana]
  );
  console.log(`\nBloque ${g.bloque_id} - ${g.dia_semana}:`);
  console.table(rows);
}

await conn.end();
