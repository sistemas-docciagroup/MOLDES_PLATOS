-- Tabla: of_moldes_asignados
-- Guarda la relación entre una Orden de Fabricación y el molde asignado.
-- Una OF solo puede tener un molde asignado a la vez (UPSERT por numero_of).

CREATE TABLE dbo.of_moldes_asignados (
    id                   INT IDENTITY(1,1)  NOT NULL,
    numero_of            NVARCHAR(120)      NOT NULL,
    numero_molde         NVARCHAR(120)      NOT NULL,
    modelo               NVARCHAR(120)      NULL,
    medida               NVARCHAR(60)       NULL,
    color                NVARCHAR(60)       NULL,
    asignado_por_id      NVARCHAR(36)       NULL,
    asignado_por_nombre  NVARCHAR(120)      NULL,
    puesto               NVARCHAR(60)       NULL,
    created_at           DATETIME           NOT NULL DEFAULT GETDATE(),
    updated_at           DATETIME           NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_of_moldes_asignados PRIMARY KEY (id),
    CONSTRAINT UQ_of_moldes_asignados_of UNIQUE (numero_of)
);

CREATE INDEX IX_of_moldes_asignados_molde ON dbo.of_moldes_asignados (numero_molde);
