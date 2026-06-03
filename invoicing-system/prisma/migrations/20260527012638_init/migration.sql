-- CreateTable
CREATE TABLE "tipogasto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipogasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipofactura" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipofactura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipodocumento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipodocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "proveedor" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "imagen" TEXT,
    "tipoGastoId" INTEGER NOT NULL,
    "tipoFacturaId" INTEGER NOT NULL,
    "tipoDocumentoId" INTEGER NOT NULL,
    "datosExtraidos" JSONB,
    "identificadorUsuario" TEXT,
    "facturaFisico" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_envio" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destinatario" TEXT NOT NULL,
    "medioEnvio" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "detalle_envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_envio" (
    "id" SERIAL NOT NULL,
    "facturaId" INTEGER NOT NULL,
    "detalleEnvioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factura_envio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipogasto_nombre_key" ON "tipogasto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipofactura_nombre_key" ON "tipofactura"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipodocumento_nombre_key" ON "tipodocumento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "factura_usuarioId_idx" ON "factura"("usuarioId");

-- CreateIndex
CREATE INDEX "factura_tipoGastoId_idx" ON "factura"("tipoGastoId");

-- CreateIndex
CREATE INDEX "factura_fecha_idx" ON "factura"("fecha");

-- CreateIndex
CREATE INDEX "detalle_envio_usuarioId_idx" ON "detalle_envio"("usuarioId");

-- CreateIndex
CREATE INDEX "detalle_envio_timestamp_idx" ON "detalle_envio"("timestamp");

-- CreateIndex
CREATE INDEX "factura_envio_facturaId_idx" ON "factura_envio"("facturaId");

-- CreateIndex
CREATE INDEX "factura_envio_detalleEnvioId_idx" ON "factura_envio"("detalleEnvioId");

-- CreateIndex
CREATE UNIQUE INDEX "factura_envio_facturaId_detalleEnvioId_key" ON "factura_envio"("facturaId", "detalleEnvioId");

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_tipoGastoId_fkey" FOREIGN KEY ("tipoGastoId") REFERENCES "tipogasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_tipoFacturaId_fkey" FOREIGN KEY ("tipoFacturaId") REFERENCES "tipofactura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "tipodocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_envio" ADD CONSTRAINT "detalle_envio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_envio" ADD CONSTRAINT "factura_envio_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_envio" ADD CONSTRAINT "factura_envio_detalleEnvioId_fkey" FOREIGN KEY ("detalleEnvioId") REFERENCES "detalle_envio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
