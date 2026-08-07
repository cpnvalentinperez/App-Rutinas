-- ============================================================
-- APP DE RUTINAS DE GIMNASIO - MODELO DE DATOS (MySQL)
-- Entrenamiento por patrón de movimiento, bloques y sesiones
-- ============================================================

CREATE TABLE ejercicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  patron_movimiento ENUM(
    'empuje', 'tiron', 'rodilla', 'cadera', 'core',
    'rotacion', 'potencia', 'aceleracion', 'desaceleracion',
    'estabilidad', 'movilidad'
  ) NOT NULL,
  tipo ENUM('pesas', 'calistenia', 'pliometria', 'movilidad') NOT NULL,
  equipamiento ENUM(
    'barra', 'mancuerna', 'kettlebell', 'trap_bar',
    'battle_rope', 'peso_corporal', 'ninguno'
  ) NOT NULL,
  nivel ENUM('intro', 'intermedio', 'avanzado') NOT NULL DEFAULT 'intermedio',
  video_url VARCHAR(255) NULL,
  notas VARCHAR(255) NULL,
  veces_usado INT NOT NULL DEFAULT 0,
  fecha_agregado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX idx_patron (patron_movimiento),
  INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bloques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  foco ENUM('potencia', 'fuerza', 'hipertrofia_funcional', 'deload') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  duracion_semanas TINYINT NOT NULL,
  notas VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sesiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bloque_id INT NOT NULL,
  dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  nombre VARCHAR(120) NULL, -- ej: "Empuje + Potencia + Core"
  duracion_estimada_min TINYINT NOT NULL DEFAULT 40,
  FOREIGN KEY (bloque_id) REFERENCES bloques(id) ON DELETE CASCADE,
  UNIQUE KEY uq_bloque_dia (bloque_id, dia_semana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sesion_ejercicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sesion_id INT NOT NULL,
  ejercicio_id INT NOT NULL,
  fase ENUM('movilidad', 'activacion', 'potencia', 'fuerza', 'accesorios', 'core', 'finisher') NOT NULL,
  orden TINYINT NOT NULL,
  metodo ENUM(
    'tradicional', 'superserie', 'circuito', 'emom', 'amrap', 'contraste', 'complejo'
  ) NOT NULL DEFAULT 'tradicional',
  series TINYINT NULL,
  reps VARCHAR(20) NULL, -- admite "8", "8-10", "max", "6 c/lado"
  descanso_seg SMALLINT NULL,
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE,
  FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE recetas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  tipo_comida ENUM('desayuno','snack','almuerzo','merienda','cena') NOT NULL,
  tiempo_prep_min TINYINT NOT NULL,
  porciones TINYINT NOT NULL DEFAULT 1,
  dificultad ENUM('facil','media','elaborada') NOT NULL DEFAULT 'facil',
  calorias_aprox SMALLINT NULL,
  proteina_aprox_g SMALLINT NULL,
  carbohidratos_g SMALLINT NULL,
  grasas_g SMALLINT NULL,
  fibra_g SMALLINT NULL,
  vegetariana BOOLEAN NOT NULL DEFAULT FALSE,
  vegana BOOLEAN NOT NULL DEFAULT FALSE,
  sin_gluten BOOLEAN NOT NULL DEFAULT FALSE,
  meal_prep BOOLEAN NOT NULL DEFAULT FALSE,
  congelable BOOLEAN NOT NULL DEFAULT FALSE,
  costo ENUM('bajo','medio','alto') NOT NULL DEFAULT 'medio',
  instrucciones TEXT NOT NULL,
  notas VARCHAR(255) NULL,
  INDEX idx_tipo_comida (tipo_comida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ingredientes_comida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE receta_ingredientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receta_id INT NOT NULL,
  ingrediente_id INT NOT NULL,
  cantidad VARCHAR(40) NULL,
  FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
  FOREIGN KEY (ingrediente_id) REFERENCES ingredientes_comida(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Objetivo (musculo, definicion, potencia...) y tag libre (pollo, wok,
-- rapido...) son catálogos dinámicos: se crean sobre la marcha igual que
-- ingredientes_comida, no hace falta precargarlos.
CREATE TABLE objetivos_comida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE receta_objetivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receta_id INT NOT NULL,
  objetivo_id INT NOT NULL,
  FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
  FOREIGN KEY (objetivo_id) REFERENCES objetivos_comida(id) ON DELETE CASCADE,
  UNIQUE KEY uq_receta_objetivo (receta_id, objetivo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tags_comida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE receta_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receta_id INT NOT NULL,
  tag_id INT NOT NULL,
  FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags_comida(id) ON DELETE CASCADE,
  UNIQUE KEY uq_receta_tag (receta_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Registra cada vez que una receta entra en un plan generado, para poder
-- evitar de verdad "no repetir en los últimos N días" (a diferencia de
-- veces_usado en ejercicios, que es un contador global sin fecha).
CREATE TABLE receta_usos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receta_id INT NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
  INDEX idx_receta_fecha (receta_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE planes_comida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  notas VARCHAR(255) NULL,
  fecha_creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE plan_comidas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  tipo_comida ENUM('desayuno','snack','almuerzo','merienda','cena') NOT NULL,
  receta_id INT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES planes_comida(id) ON DELETE CASCADE,
  FOREIGN KEY (receta_id) REFERENCES recetas(id),
  UNIQUE KEY uq_plan_dia_tipo (plan_id, dia_semana, tipo_comida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE historial_entrenamientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  sesion_id INT NOT NULL,
  ejercicio_id INT NOT NULL,
  peso_usado_kg DECIMAL(5,2) NULL,
  reps_reales VARCHAR(20) NULL,
  rpe TINYINT NULL, -- percepción de esfuerzo 1-10
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id),
  FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SEED INICIAL: ejercicios de tu lista, categorizados por patrón
-- video_url queda NULL para completar despues (o vía form de alta)
-- ============================================================

INSERT INTO ejercicios (nombre, patron_movimiento, tipo, equipamiento, nivel, notas) VALUES
-- RODILLA
('Sentadilla frontal', 'rodilla', 'pesas', 'barra', 'intermedio', 'Sentadilla con la barra apoyada al frente de los hombros; exige más core y cuádriceps.'),
('Sentadilla trasera', 'rodilla', 'pesas', 'barra', 'intermedio', 'Sentadilla clásica con la barra en la espalda alta; ejercicio base de fuerza de piernas.'),
('Sentadilla búlgara a una pierna (Bulgarian Split Squat)', 'rodilla', 'pesas', 'mancuerna', 'intermedio', 'Sentadilla búlgara: una pierna adelante y el pie trasero apoyado en un banco, con mancuernas.'),
('Zancadas caminando (Walking Lunges)', 'rodilla', 'pesas', 'mancuerna', 'intro', 'Zancadas caminando hacia adelante alternando piernas, con mancuernas a los costados.'),
('Subida al banco a una pierna (Step Up)', 'rodilla', 'pesas', 'mancuerna', 'intro', 'Subida a un cajón o banco con una pierna, empujando con el talón; trabaja cuádriceps y glúteo.'),

-- CADERA
('Peso muerto', 'cadera', 'pesas', 'barra', 'intermedio', 'Levantar la barra del piso extendiendo cadera y rodillas; ejercicio base de cadena posterior.'),
('Peso muerto rumano', 'cadera', 'pesas', 'barra', 'intermedio', 'Variante con piernas casi extendidas, bajando la barra por delante de las piernas; foco en isquiotibiales.'),
('Peso muerto con trap bar', 'cadera', 'pesas', 'trap_bar', 'intermedio', 'Peso muerto con barra hexagonal (trap bar); más cómodo para la espalda que el peso muerto clásico.'),
('Empuje de cadera con barra (Hip Thrust)', 'cadera', 'pesas', 'barra', 'intro', 'Empuje de cadera con espalda apoyada en un banco y barra sobre la cadera; foco en glúteos.'),
('Balanceo de kettlebell (Kettlebell Swing)', 'cadera', 'pesas', 'kettlebell', 'intermedio', 'Balanceo de kettlebell impulsado por la cadera, no por los brazos; potencia de cadena posterior.'),
('Zancada con salto (potencia unilateral)', 'cadera', 'pliometria', 'ninguno', 'avanzado', 'Zancada explosiva alternando piernas en el aire; potencia de cadera y rodilla específica para el salto y el sprint.'),

-- EMPUJE
('Press banca', 'empuje', 'pesas', 'barra', 'intermedio', 'Press de banca plano con barra; ejercicio clásico de empuje horizontal para pecho.'),
('Press inclinado', 'empuje', 'pesas', 'mancuerna', 'intermedio', 'Press en banco inclinado con mancuernas; enfatiza la parte superior del pecho.'),
('Press militar con impulso de piernas (Push Press)', 'empuje', 'pesas', 'barra', 'avanzado', 'Press militar con impulso de piernas para ayudar a subir la barra; potencia de empuje vertical.'),
('Press militar', 'empuje', 'pesas', 'barra', 'intermedio', 'Press de hombros de pie con barra, sin impulso de piernas.'),
('Fondos', 'empuje', 'calistenia', 'peso_corporal', 'intermedio', 'Dips en paralelas, bajando el cuerpo y empujando hacia arriba; pecho, hombro y tríceps.'),
('Flexiones explosivas', 'empuje', 'calistenia', 'peso_corporal', 'intermedio', 'Flexiones de brazos con despegue de manos del piso; potencia de empuje horizontal.'),

-- TIRON
('Remo barra', 'tiron', 'pesas', 'barra', 'intermedio', 'Remo con barra inclinado hacia adelante, tirando hacia el abdomen; espalda media.'),
('Remo Pendlay', 'tiron', 'pesas', 'barra', 'avanzado', 'Remo con barra que parte desde el piso en cada repetición, torso paralelo al suelo.'),
('Dominadas', 'tiron', 'calistenia', 'peso_corporal', 'intermedio', 'Colgado de una barra, tirar el cuerpo hacia arriba hasta pasar el mentón la barra.'),
('Dominadas supinas (Chin Ups)', 'tiron', 'calistenia', 'peso_corporal', 'intermedio', 'Como las dominadas pero con agarre supino (palmas hacia vos); más énfasis en bíceps.'),
('Remo invertido', 'tiron', 'calistenia', 'peso_corporal', 'intro', 'Acostado bajo una barra baja, tirar el pecho hacia la barra con el cuerpo recto; dominada horizontal.'),

-- POTENCIA
('Sentadilla frontal + press (Thruster)', 'potencia', 'pesas', 'barra', 'avanzado', 'Sentadilla frontal seguida de press militar en un solo movimiento explosivo.'),
('Ondas con soga pesada (Battle Rope)', 'potencia', 'pesas', 'battle_rope', 'intro', 'Ondas con sogas pesadas ancladas a un punto fijo; potencia y resistencia de tren superior.'),
('Burpee + Dominada', 'potencia', 'calistenia', 'peso_corporal', 'avanzado', 'Burpee que termina saltando a una barra para hacer una dominada; full body explosivo.'),
('Salto al cajón (Box Jump)', 'potencia', 'pliometria', 'ninguno', 'intermedio', 'Salto explosivo con ambas piernas hacia un cajón.'),
('Salto en profundidad (Depth Jump)', 'potencia', 'pliometria', 'ninguno', 'avanzado', 'Bajar de un cajón y, al tocar el piso, saltar inmediatamente lo más alto o lejos posible.'),
('Salto horizontal a distancia (Broad Jump)', 'potencia', 'pliometria', 'ninguno', 'intermedio', 'Salto horizontal a máxima distancia con ambas piernas.'),
('Salto lateral tipo patinador (Skater Jump)', 'potencia', 'pliometria', 'ninguno', 'intermedio', 'Saltos laterales de una pierna a la otra, imitando el patinaje; potencia y estabilidad lateral.'),
('Saltos laterales a una pierna (Lateral Bounds)', 'potencia', 'pliometria', 'ninguno', 'intermedio', 'Saltos laterales explosivos aterrizando y estabilizando en una sola pierna.'),
('Sentadilla con salto (Jump Squat)', 'potencia', 'pliometria', 'ninguno', 'intro', 'Sentadilla con salto vertical explosivo al final del movimiento.'),
('Salto vertical a una pierna (Single Leg Jump)', 'potencia', 'pliometria', 'ninguno', 'avanzado', 'Salto vertical u horizontal impulsado con una sola pierna.'),
('Zancadas explosivas de potencia (Bounding)', 'potencia', 'pliometria', 'ninguno', 'avanzado', 'Zancadas exageradas y explosivas alternando piernas, tipo saltos de paso largo.'),
('Salto vertical con contramovimiento (CMJ)', 'potencia', 'pliometria', 'ninguno', 'intermedio', 'Flexionar rápido las rodillas y saltar lo más alto posible; el ejercicio/test clásico de potencia vertical.'),

-- ACELERACION / DESACELERACION / ESTABILIDAD
('Sprint 10-20 m', 'aceleracion', 'pliometria', 'ninguno', 'intermedio', 'Carrera corta a máxima velocidad desde parado; trabaja la aceleración.'),
('Sprint en cuesta (Hill Sprint)', 'aceleracion', 'pliometria', 'ninguno', 'intermedio', 'Carrera corta a máxima intensidad en subida; la pendiente sobrecarga la fase de aceleración con menos impacto.'),
('Arrancada explosiva en 3 apoyos', 'aceleracion', 'pliometria', 'ninguno', 'intermedio', 'Salida explosiva desde posición baja (una mano y ambos pies apoyados) tipo arranque de velocista.'),
('Desplazamiento lateral defensivo (Shuffle)', 'desaceleracion', 'pliometria', 'ninguno', 'intermedio', 'Desplazamiento lateral rápido tipo defensa de básquet, sin cruzar los pies.'),
('Cambios de dirección', 'desaceleracion', 'pliometria', 'ninguno', 'intermedio', 'Frenar y cambiar de dirección a máxima velocidad, por ejemplo en forma de V o de L.'),
('Salto y frenado a una pierna', 'desaceleracion', 'pliometria', 'ninguno', 'avanzado', 'Saltar y aterrizar controlando el impacto en una sola pierna sin perder el equilibrio; previene lesiones en cambios de dirección.'),
('Caminata con peso en cada mano (Farmer Walk)', 'estabilidad', 'pesas', 'mancuerna', 'intro', 'Caminar sosteniendo una mancuerna pesada en cada mano; agarre, core y postura.'),
('Plancha lateral de aductores (Copenhagen Plank)', 'estabilidad', 'movilidad', 'peso_corporal', 'avanzado', 'Plancha lateral con la pierna de arriba apoyada en un banco; aductores y core.'),

-- CORE
('Rueda abdominal (Ab Wheel)', 'core', 'movilidad', 'ninguno', 'intermedio', 'Rueda abdominal: extender el cuerpo hacia adelante de rodillas y volver, sin arquear la espalda baja.'),
('Plancha hueca isométrica (Hollow Hold)', 'core', 'calistenia', 'peso_corporal', 'intro', 'Acostado boca arriba, levantar hombros y piernas formando una C; core isométrico.'),
('Isométrico en L (L-Sit)', 'core', 'calistenia', 'peso_corporal', 'avanzado', 'Sostenerse con brazos extendidos y piernas rectas al frente, formando una L.'),
('Elevación de piernas colgado de la barra', 'core', 'calistenia', 'peso_corporal', 'intermedio', 'Colgado de una barra, levantar las piernas rectas hasta la horizontal o más arriba.'),
('Plancha', 'core', 'calistenia', 'peso_corporal', 'intro', 'Sostener el cuerpo recto apoyado en antebrazos y puntas de pie.'),
('Plancha lateral', 'core', 'calistenia', 'peso_corporal', 'intro', 'Plancha apoyada de un lado, cuerpo en línea recta; oblicuos y estabilidad lateral.'),
('Plancha con toque de hombro', 'core', 'calistenia', 'peso_corporal', 'intermedio', 'En plancha alta, tocar alternadamente cada hombro con la mano contraria sin rotar la cadera; anti-rotación dinámica.'),

-- ROTACION
('Giro ruso de torso (Russian Twist)', 'rotacion', 'calistenia', 'peso_corporal', 'intro', 'Sentado con el torso inclinado atrás, girar el torso de lado a lado.'),
('Press anti-rotación de pie (Pallof Press)', 'rotacion', 'pesas', 'ninguno', 'intro', 'Con una polea o banda al costado, empujar un mango al frente resistiendo la rotación del torso.'),
('Lanzamiento rotacional con balón medicinal', 'rotacion', 'pliometria', 'ninguno', 'intermedio', 'Girar la cadera y lanzar un balón medicinal contra una pared desde el costado; potencia rotacional para remates y lanzamientos.'),
('Lanzamiento de balón medicinal por encima de cabeza', 'rotacion', 'pliometria', 'ninguno', 'intro', 'Elevar el balón medicinal y lanzarlo con fuerza contra el piso adelante, extendiendo todo el cuerpo; potencia de tren superior y core.'),

-- MOVILIDAD
('90/90', 'movilidad', 'movilidad', 'ninguno', 'intro', 'Sentado en el piso con ambas piernas dobladas a 90°, una adelante y otra atrás; movilidad de cadera.'),
('Sentadilla lateral profunda (Cossack Squat)', 'movilidad', 'movilidad', 'ninguno', 'intermedio', 'Sentadilla lateral profunda, llevando el peso a una pierna mientras la otra queda estirada al costado.'),
('Estiramiento de cuádriceps contra pared (Couch Stretch)', 'movilidad', 'movilidad', 'ninguno', 'intro', 'Estiramiento de cuádriceps y flexor de cadera con el pie trasero apoyado en un sillón o pared.'),
('Estocada con giro y alcance (World''s Greatest Stretch)', 'movilidad', 'movilidad', 'ninguno', 'intro', 'Combo de estocada con giro de torso y alcance; moviliza cadera, columna y hombros en un solo movimiento.'),
('Sentadilla búlgara en rango completo (ATG Split Squat)', 'movilidad', 'movilidad', 'ninguno', 'intermedio', 'Sentadilla búlgara en rango completo, bajando el talón trasero al piso; movilidad de tobillo y rodilla.'),
('Sentadilla con rodilla adelantada (Knee Over Toe)', 'movilidad', 'movilidad', 'ninguno', 'intermedio', 'Sentadilla dejando avanzar la rodilla adelante de la punta del pie; fortalece la rodilla en rango completo.'),
('Rotación de cadera a una pierna (Hip Airplane)', 'movilidad', 'movilidad', 'ninguno', 'intro', 'Parado en una pierna, rotar la cadera y el torso hacia los costados manteniendo el equilibrio.'),
('Elevación de tibial anterior contra pared', 'movilidad', 'movilidad', 'ninguno', 'intro', 'Apoyado de espalda contra una pared, levantar la punta del pie; fortalece la tibial anterior.'),
('Colgado pasivo de la barra (Dead Hang)', 'movilidad', 'movilidad', 'peso_corporal', 'intro', 'Colgarse de una barra con brazos extendidos, sin hacer fuerza; descomprime hombros y columna.');
