// consultar.js
import mysql from 'mysql2/promise';
import 'dotenv/config';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }, // evita el lío de certificados para este chequeo rápido
});

const [rows] = await conn.execute(
  `SELECT id, bloque_id, dia_semana, nombre FROM sesiones WHERE bloque_id = 1 AND dia_semana = 'lunes'`
);
console.log(rows);
await conn.end();