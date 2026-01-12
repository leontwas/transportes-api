-- Schema Export for Render

CREATE TYPE bateas_estado_enum AS ENUM ('cargado', 'vacio', 'en_reparacion');
CREATE TYPE choferes_estado_chofer_enum AS ENUM ('disponible', 'cargando', 'viajando', 'descansando', 'descargando', 'entrega_finalizada', 'licencia_anual', 'franco', 'equipo_en_reparacion', 'inactivo');
CREATE TYPE tractores_estado_tractor_enum AS ENUM ('ocupado', 'en_reparacion', 'libre');
CREATE TYPE usuarios_rol_enum AS ENUM ('admin', 'chofer');
CREATE TYPE viajes_estado_viaje_enum AS ENUM ('en_curso', 'cargando', 'viajando', 'descansando', 'descargando', 'finalizado', 'en_reclamo');

-- Table: usuarios
CREATE TABLE usuarios (
  usuario_id SERIAL,
  email CHARACTER VARYING NOT NULL,
  password CHARACTER VARYING NOT NULL,
  nombre CHARACTER VARYING NOT NULL,
  rol usuarios_rol_enum NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  ultimo_login TIMESTAMP WITHOUT TIME ZONE,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  chofer_id INTEGER
);

-- Table: periodos_descanso
CREATE TABLE periodos_descanso (
  id_periodo SERIAL,
  viaje_id INTEGER NOT NULL,
  inicio_descanso TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  fin_descanso TIMESTAMP WITHOUT TIME ZONE,
  horas_calculadas NUMERIC,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- Table: bateas
CREATE TABLE bateas (
  marca CHARACTER VARYING NOT NULL,
  modelo CHARACTER VARYING NOT NULL,
  patente CHARACTER VARYING NOT NULL,
  seguro CHARACTER VARYING,
  estado bateas_estado_enum NOT NULL,
  carga_max_batea INTEGER,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  batea_id SERIAL,
  chofer_id INTEGER,
  tractor_id INTEGER
);

-- Table: tractores
CREATE TABLE tractores (
  marca CHARACTER VARYING NOT NULL,
  modelo CHARACTER VARYING NOT NULL,
  patente CHARACTER VARYING NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  seguro CHARACTER VARYING,
  estado_tractor tractores_estado_tractor_enum NOT NULL,
  carga_max_tractor INTEGER,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  tractor_id SERIAL,
  chofer_id INTEGER,
  batea_id INTEGER
);

-- Table: choferes
CREATE TABLE choferes (
  nombre_completo CHARACTER VARYING NOT NULL,
  estado_chofer choferes_estado_chofer_enum NOT NULL,
  razon_estado CHARACTER VARYING,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  ultimo_estado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  id_chofer SERIAL,
  tractor_id INTEGER,
  batea_id INTEGER,
  fecha_inicio_licencia TIMESTAMP WITHOUT TIME ZONE,
  fecha_fin_licencia TIMESTAMP WITHOUT TIME ZONE,
  ultimo_inicio_descanso TIMESTAMP WITHOUT TIME ZONE,
  ultimo_fin_descanso TIMESTAMP WITHOUT TIME ZONE
);

-- Table: viajes
CREATE TABLE viajes (
  origen CHARACTER VARYING NOT NULL,
  destino CHARACTER VARYING NOT NULL,
  fecha_salida TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  numero_remito CHARACTER VARYING,
  toneladas_cargadas DOUBLE PRECISION,
  toneladas_descargadas DOUBLE PRECISION,
  creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  id_viaje SERIAL,
  chofer_id INTEGER NOT NULL,
  tractor_id INTEGER NOT NULL,
  batea_id INTEGER NOT NULL,
  fecha_descarga TIMESTAMP WITHOUT TIME ZONE,
  estado_viaje viajes_estado_viaje_enum NOT NULL,
  horas_descansadas NUMERIC NOT NULL
);


-- Initial Admin Data
INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ('admin@transporte.com', '$2b$10$7b7R.p9Yn8Y6v6R6P6P6Pe6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y', 'Admin Sistema', 'admin', true);
ALTER TABLE batea ADD PRIMARY KEY (batea_id);
ALTER TABLE bateas ADD PRIMARY KEY (batea_id);
ALTER TABLE tractores ADD PRIMARY KEY (tractor_id);
ALTER TABLE choferes ADD PRIMARY KEY (id_chofer);
ALTER TABLE viajes ADD PRIMARY KEY (id_viaje);
ALTER TABLE usuarios ADD PRIMARY KEY (usuario_id);
ALTER TABLE periodos_descanso ADD PRIMARY KEY (id_periodo);

