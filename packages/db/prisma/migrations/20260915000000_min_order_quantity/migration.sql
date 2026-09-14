-- Minimum order quantity for bulk lines (return gifts). Null keeps a product
-- on ordinary one-at-a-time sale, so no existing row changes behaviour.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "minOrderQuantity" INTEGER;
