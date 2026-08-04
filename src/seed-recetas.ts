import type { Pool } from 'mysql2/promise';
import { crearReceta, type RecetaInput } from './recetas-repo.js';

const RECETAS: RecetaInput[] = [
  // ── DESAYUNO ──
  {
    nombre: 'Tostadas con palta y huevo',
    tipoComida: 'desayuno',
    tiempoPrepMin: 10,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 320,
    proteinaAproxG: 16,
    instrucciones:
      'Tostar el pan. Pisar la palta con un tenedor y condimentar con sal y limón. Cocinar el huevo a gusto (frito o poché). Untar el pan con la palta y poner el huevo arriba.',
    ingredientes: [
      { nombre: 'Pan integral', cantidad: '2 rebanadas' },
      { nombre: 'Palta', cantidad: '1/2 unidad' },
      { nombre: 'Huevo', cantidad: '1 unidad' },
      { nombre: 'Sal y limón', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Yogur con avena y banana',
    tipoComida: 'desayuno',
    tiempoPrepMin: 5,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 280,
    proteinaAproxG: 14,
    instrucciones:
      'Cortar la banana en rodajas. Mezclar el yogur con la avena. Agregar la banana arriba y un chorrito de miel si querés.',
    ingredientes: [
      { nombre: 'Yogur natural', cantidad: '1 pote' },
      { nombre: 'Avena', cantidad: '3 cdas' },
      { nombre: 'Banana', cantidad: '1 unidad' },
      { nombre: 'Miel', cantidad: '1 cdita (opcional)' },
    ],
  },
  {
    nombre: 'Huevos revueltos con espinaca',
    tipoComida: 'desayuno',
    tiempoPrepMin: 8,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 260,
    proteinaAproxG: 20,
    instrucciones:
      'Calentar el aceite en una sartén y saltear la espinaca 1 minuto. Batir los huevos, agregar a la sartén y revolver hasta que cuajen. Salpimentar.',
    ingredientes: [
      { nombre: 'Huevo', cantidad: '2 unidades' },
      { nombre: 'Espinaca', cantidad: '1 puñado' },
      { nombre: 'Aceite de oliva', cantidad: '1 cdita' },
      { nombre: 'Sal y pimienta', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Panqueque de avena y banana',
    tipoComida: 'desayuno',
    tiempoPrepMin: 10,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 300,
    proteinaAproxG: 15,
    instrucciones:
      'Pisar la banana, mezclar con el huevo y la avena hasta formar una masa. Cocinar en sartén antiadherente vuelta y vuelta a fuego medio. Espolvorear canela.',
    ingredientes: [
      { nombre: 'Avena', cantidad: '1/2 taza' },
      { nombre: 'Banana', cantidad: '1 unidad' },
      { nombre: 'Huevo', cantidad: '1 unidad' },
      { nombre: 'Canela', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Smoothie proteico de frutos rojos',
    tipoComida: 'desayuno',
    tiempoPrepMin: 5,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 250,
    proteinaAproxG: 22,
    instrucciones: 'Poner todo en la licuadora y procesar hasta que quede cremoso. Servir frío.',
    ingredientes: [
      { nombre: 'Frutos rojos congelados', cantidad: '1 taza' },
      { nombre: 'Yogur natural', cantidad: '1 pote' },
      { nombre: 'Leche', cantidad: '1/2 taza' },
      { nombre: 'Proteína en polvo', cantidad: '1 medida (opcional)' },
    ],
  },
  {
    nombre: 'Tostadas con queso untable y tomate',
    tipoComida: 'desayuno',
    tiempoPrepMin: 5,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 230,
    proteinaAproxG: 10,
    instrucciones: 'Tostar el pan, untar el queso, poner rodajas de tomate arriba y espolvorear orégano.',
    ingredientes: [
      { nombre: 'Pan integral', cantidad: '2 rebanadas' },
      { nombre: 'Queso untable light', cantidad: '2 cdas' },
      { nombre: 'Tomate', cantidad: '1 unidad' },
      { nombre: 'Orégano', cantidad: 'a gusto' },
    ],
  },

  // ── ALMUERZO ──
  {
    nombre: 'Pollo grillado con arroz y brócoli',
    tipoComida: 'almuerzo',
    tiempoPrepMin: 25,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 450,
    proteinaAproxG: 40,
    instrucciones:
      'Cocinar el arroz según el paquete. Hervir o saltear el brócoli 5 minutos. Grillar la pechuga salpimentada de ambos lados hasta que esté cocida. Servir todo junto con un chorrito de limón.',
    ingredientes: [
      { nombre: 'Pechuga de pollo', cantidad: '200 g' },
      { nombre: 'Arroz', cantidad: '1 taza cocido' },
      { nombre: 'Brócoli', cantidad: '1 taza' },
      { nombre: 'Sal, pimienta y limón', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Ensalada de atún y garbanzos',
    tipoComida: 'almuerzo',
    tiempoPrepMin: 10,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 380,
    proteinaAproxG: 28,
    instrucciones:
      'Escurrir el atún y los garbanzos. Cortar el tomate y la cebolla en cubos chicos. Mezclar todo con un chorrito de aceite de oliva y limón.',
    ingredientes: [
      { nombre: 'Atún al natural', cantidad: '1 lata' },
      { nombre: 'Garbanzos cocidos', cantidad: '1 taza' },
      { nombre: 'Tomate', cantidad: '1 unidad' },
      { nombre: 'Cebolla morada', cantidad: '1/4 unidad' },
      { nombre: 'Aceite de oliva y limón', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Wrap de pollo y vegetales',
    tipoComida: 'almuerzo',
    tiempoPrepMin: 15,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 400,
    proteinaAproxG: 32,
    instrucciones:
      'Untar la tortilla con el queso. Poner el pollo cortado en tiras, la lechuga y el tomate. Enrollar bien apretado y cortar al medio.',
    ingredientes: [
      { nombre: 'Tortilla integral', cantidad: '1 unidad' },
      { nombre: 'Pechuga de pollo cocida', cantidad: '150 g' },
      { nombre: 'Lechuga', cantidad: 'unas hojas' },
      { nombre: 'Tomate', cantidad: '1 unidad' },
      { nombre: 'Queso untable light', cantidad: '1 cda' },
    ],
  },
  {
    nombre: 'Salmón al horno con batata',
    tipoComida: 'almuerzo',
    tiempoPrepMin: 30,
    porciones: 1,
    dificultad: 'media',
    caloriasAprox: 480,
    proteinaAproxG: 35,
    instrucciones:
      'Cortar la batata en rodajas y hornear 20 minutos a 200°C. Agregar el salmón salpimentado con un chorrito de aceite y hornear 12-15 minutos más. Servir con limón.',
    ingredientes: [
      { nombre: 'Filet de salmón', cantidad: '180 g' },
      { nombre: 'Batata', cantidad: '1 unidad' },
      { nombre: 'Aceite de oliva', cantidad: '1 cda' },
      { nombre: 'Sal, pimienta y limón', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Fideos integrales con atún y tomate',
    tipoComida: 'almuerzo',
    tiempoPrepMin: 15,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 420,
    proteinaAproxG: 26,
    instrucciones:
      'Cocinar los fideos según el paquete. Dorar el ajo picado en aceite, agregar el tomate triturado y cocinar 5 minutos. Sumar el atún escurrido y mezclar con los fideos.',
    ingredientes: [
      { nombre: 'Fideos integrales', cantidad: '80 g' },
      { nombre: 'Atún al natural', cantidad: '1 lata' },
      { nombre: 'Tomate triturado', cantidad: '1/2 taza' },
      { nombre: 'Ajo', cantidad: '1 diente' },
      { nombre: 'Aceite de oliva', cantidad: '1 cdita' },
    ],
  },
  {
    nombre: 'Bowl de quinoa con huevo y palta',
    tipoComida: 'almuerzo',
    tiempoPrepMin: 20,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 430,
    proteinaAproxG: 20,
    instrucciones:
      'Cocinar la quinoa según el paquete. Cocinar el huevo (poché o duro). Armar el bowl con la quinoa, la palta en láminas, los tomates cherry y el huevo arriba.',
    ingredientes: [
      { nombre: 'Quinoa', cantidad: '1/2 taza cruda' },
      { nombre: 'Huevo', cantidad: '1 unidad' },
      { nombre: 'Palta', cantidad: '1/2 unidad' },
      { nombre: 'Tomate cherry', cantidad: '1 puñado' },
      { nombre: 'Sal y limón', cantidad: 'a gusto' },
    ],
  },

  // ── CENA ──
  {
    nombre: 'Tortilla de vegetales',
    tipoComida: 'cena',
    tiempoPrepMin: 15,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 300,
    proteinaAproxG: 18,
    instrucciones:
      'Rallar o cortar fino el zapallito y la cebolla, saltear 5 minutos. Batir los huevos, agregar los vegetales y salpimentar. Cocinar en sartén tapada a fuego bajo hasta que cuaje, dar vuelta y dorar del otro lado.',
    ingredientes: [
      { nombre: 'Huevo', cantidad: '3 unidades' },
      { nombre: 'Zapallito', cantidad: '1 unidad' },
      { nombre: 'Cebolla', cantidad: '1/2 unidad' },
      { nombre: 'Sal y pimienta', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Merluza al limón con ensalada',
    tipoComida: 'cena',
    tiempoPrepMin: 15,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 320,
    proteinaAproxG: 30,
    instrucciones:
      'Cocinar la merluza en sartén con un chorrito de aceite y jugo de limón, 3-4 minutos de cada lado. Servir con una ensalada simple de lechuga y tomate.',
    ingredientes: [
      { nombre: 'Filet de merluza', cantidad: '180 g' },
      { nombre: 'Limón', cantidad: '1 unidad' },
      { nombre: 'Lechuga y tomate', cantidad: 'a gusto' },
      { nombre: 'Aceite de oliva', cantidad: '1 cdita' },
    ],
  },
  {
    nombre: 'Revuelto de zapallitos con huevo y jamón',
    tipoComida: 'cena',
    tiempoPrepMin: 12,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 280,
    proteinaAproxG: 22,
    instrucciones:
      'Cortar el zapallito en cubos y saltear 5 minutos. Agregar el jamón picado y los huevos batidos, revolver hasta que cuajen.',
    ingredientes: [
      { nombre: 'Zapallito', cantidad: '2 unidades' },
      { nombre: 'Huevo', cantidad: '2 unidades' },
      { nombre: 'Jamón cocido', cantidad: '2 fetas' },
      { nombre: 'Sal y pimienta', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Hamburguesas caseras de carne con ensalada',
    tipoComida: 'cena',
    tiempoPrepMin: 20,
    porciones: 2,
    dificultad: 'facil',
    caloriasAprox: 400,
    proteinaAproxG: 35,
    instrucciones:
      'Condimentar la carne y formar dos hamburguesas. Cocinar en sartén o parrilla 4-5 minutos de cada lado. Servir con ensalada simple.',
    ingredientes: [
      { nombre: 'Carne picada magra', cantidad: '200 g' },
      { nombre: 'Sal, pimienta y orégano', cantidad: 'a gusto' },
      { nombre: 'Lechuga y tomate', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Sopa de vegetales con pollo desmenuzado',
    tipoComida: 'cena',
    tiempoPrepMin: 25,
    porciones: 2,
    dificultad: 'facil',
    caloriasAprox: 250,
    proteinaAproxG: 24,
    instrucciones:
      'Cortar la zanahoria y el zapallito en cubos chicos, hervir en el caldo 15 minutos. Agregar el pollo desmenuzado y cocinar 5 minutos más.',
    ingredientes: [
      { nombre: 'Pechuga de pollo cocida', cantidad: '150 g' },
      { nombre: 'Zanahoria', cantidad: '1 unidad' },
      { nombre: 'Zapallito', cantidad: '1 unidad' },
      { nombre: 'Caldo de verduras', cantidad: '1 litro' },
    ],
  },
  {
    nombre: 'Berenjenas al horno con queso',
    tipoComida: 'cena',
    tiempoPrepMin: 20,
    porciones: 2,
    dificultad: 'facil',
    caloriasAprox: 260,
    proteinaAproxG: 14,
    instrucciones:
      'Cortar la berenjena en rodajas y hornear 10 minutos a 200°C. Cubrir con salsa de tomate y queso, hornear 10 minutos más hasta gratinar.',
    ingredientes: [
      { nombre: 'Berenjena', cantidad: '1 unidad grande' },
      { nombre: 'Salsa de tomate', cantidad: '1/2 taza' },
      { nombre: 'Queso mozzarella', cantidad: '50 g' },
      { nombre: 'Orégano', cantidad: 'a gusto' },
    ],
  },

  // ── SNACK ──
  {
    nombre: 'Yogur con frutos secos',
    tipoComida: 'snack',
    tiempoPrepMin: 3,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 200,
    proteinaAproxG: 10,
    instrucciones: 'Servir el yogur y agregar los frutos secos picados arriba. Endulzar con miel si querés.',
    ingredientes: [
      { nombre: 'Yogur natural', cantidad: '1 pote' },
      { nombre: 'Frutos secos', cantidad: '1 puñado' },
      { nombre: 'Miel', cantidad: '1 cdita (opcional)' },
    ],
  },
  {
    nombre: 'Huevos duros con sal',
    tipoComida: 'snack',
    tiempoPrepMin: 10,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 140,
    proteinaAproxG: 12,
    instrucciones: 'Hervir los huevos 10 minutos. Enfriar, pelar y condimentar con sal.',
    ingredientes: [
      { nombre: 'Huevo', cantidad: '2 unidades' },
      { nombre: 'Sal', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Batido de banana y avena',
    tipoComida: 'snack',
    tiempoPrepMin: 5,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 220,
    proteinaAproxG: 10,
    instrucciones: 'Licuar todos los ingredientes hasta que quede cremoso.',
    ingredientes: [
      { nombre: 'Banana', cantidad: '1 unidad' },
      { nombre: 'Avena', cantidad: '2 cdas' },
      { nombre: 'Leche', cantidad: '1 taza' },
      { nombre: 'Canela', cantidad: 'a gusto' },
    ],
  },
  {
    nombre: 'Tostadas con ricota y mermelada light',
    tipoComida: 'snack',
    tiempoPrepMin: 5,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 180,
    proteinaAproxG: 8,
    instrucciones: 'Tostar el pan, untar con la ricota y agregar la mermelada arriba.',
    ingredientes: [
      { nombre: 'Pan integral', cantidad: '1 rebanada' },
      { nombre: 'Ricota', cantidad: '2 cdas' },
      { nombre: 'Mermelada light', cantidad: '1 cdita' },
    ],
  },
  {
    nombre: 'Palitos de zanahoria y apio con hummus',
    tipoComida: 'snack',
    tiempoPrepMin: 5,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 150,
    proteinaAproxG: 6,
    instrucciones: 'Cortar la zanahoria y el apio en bastones. Servir con el hummus para dipear.',
    ingredientes: [
      { nombre: 'Zanahoria', cantidad: '1 unidad' },
      { nombre: 'Apio', cantidad: '1 rama' },
      { nombre: 'Hummus', cantidad: '3 cdas' },
    ],
  },
  {
    nombre: 'Mix de frutos secos y pasas',
    tipoComida: 'snack',
    tiempoPrepMin: 1,
    porciones: 1,
    dificultad: 'facil',
    caloriasAprox: 180,
    proteinaAproxG: 5,
    instrucciones: 'Mezclar todo en un pote y listo para llevar.',
    ingredientes: [
      { nombre: 'Almendras', cantidad: '10 unidades' },
      { nombre: 'Nueces', cantidad: '5 unidades' },
      { nombre: 'Pasas de uva', cantidad: '1 cda' },
    ],
  },
];

// Corre automáticamente al arrancar el server (ver app.ts), igual que las
// migraciones. Solo carga el set inicial si la tabla está vacía, así que
// no pisa recetas que se vayan agregando después a mano.
export async function seedRecetas(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM recetas`);
    const cnt = (rows as any[])[0].cnt;
    if (cnt > 0) return;

    await conn.beginTransaction();

    for (const r of RECETAS) {
      await crearReceta(conn, r);
    }

    await conn.commit();
    console.log(`[seed] cargadas ${RECETAS.length} recetas`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
