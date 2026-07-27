# App de rutinas de gym — prueba local del algoritmo

## 1. Base de datos

Con MySQL corriendo local (o vía Docker):

```bash
mysql -u root -p -e "CREATE DATABASE app_rutinas_gym"
mysql -u root -p app_rutinas_gym < schema.sql
```

También necesitás al menos un bloque para poder crear sesiones:

```sql
INSERT INTO bloques (nombre, foco, fecha_inicio, fecha_fin, duracion_semanas)
VALUES ('Bloque 1 - Potencia base', 'potencia', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 5 WEEK), 5);
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar variables de entorno

```bash
cp .env.example .env
# editá .env con tu usuario/contraseña de MySQL
```

## 4. Levantar el servidor

```bash
npm run dev
```

## 5. Probar el algoritmo

```bash
curl -X POST http://localhost:3001/sesiones \
  -H "Content-Type: application/json" \
  -d '{
    "bloqueId": 1,
    "diaSemana": "lunes",
    "nombreSesion": "Empuje + Potencia + Core",
    "duracionEstimadaMin": 40,
    "fases": [
      { "fase": "activacion", "patron": "movilidad", "cantidad": 1 },
      { "fase": "potencia", "patron": "potencia", "cantidad": 1 },
      { "fase": "fuerza", "patron": "empuje", "cantidad": 1, "metodo": "superserie" },
      { "fase": "fuerza", "patron": "tiron", "cantidad": 1, "metodo": "superserie" },
      { "fase": "core", "patron": "core", "cantidad": 1 }
    ]
  }'
```

Deberías recibir `{ "sesionId": 1 }`. Para ver qué ejercicios eligió:

```sql
SELECT se.orden, se.fase, e.nombre, se.metodo
FROM sesion_ejercicios se
JOIN ejercicios e ON e.id = se.ejercicio_id
WHERE se.sesion_id = 1
ORDER BY se.orden;
```

Si corrés el mismo POST varias veces vas a notar que va rotando los ejercicios dentro de cada patrón, en vez de repetir siempre el mismo.
