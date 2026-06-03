ALTER TABLE "detalle_envio"
ADD COLUMN "periodoMes" TEXT,
ADD COLUMN "pdfUrl" TEXT,
ADD COLUMN "total" DECIMAL(10, 2),
ADD COLUMN "cantidadFacturas" INTEGER;
