-- Search support.
--
-- Both applications search products with case-insensitive substring matching
-- over name, SKU, brand and Tamil name, and the admin searches orders by
-- customer name, phone and order number. Plain B-tree indexes cannot serve
-- `ILIKE '%term%'`, so these are trigram indexes.
--
-- MAINTAINERS: Prisma's schema language cannot express GIN/trigram indexes, so
-- they are managed here by hand. `prisma migrate deploy` is unaffected, but the
-- next `prisma migrate dev` does not know about them and will offer to DROP
-- them in the migration it generates. Delete those DROP INDEX lines before
-- applying it.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Catalogue search
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Product_nameTa_trgm_idx"
  ON "Product" USING GIN ("nameTa" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Product_brand_trgm_idx"
  ON "Product" USING GIN ("brand" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Product_sku_trgm_idx"
  ON "Product" USING GIN ("sku" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Product_tags_gin_idx"
  ON "Product" USING GIN ("tags");

-- Admin order search
CREATE INDEX IF NOT EXISTS "Order_orderNumber_trgm_idx"
  ON "Order" USING GIN ("orderNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_customerName_trgm_idx"
  ON "Order" USING GIN ("customerName" gin_trgm_ops);

-- Admin customer search
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx"
  ON "User" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "User_email_trgm_idx"
  ON "User" USING GIN ("email" gin_trgm_ops);

-- Partial index for the admin's most common product filter: what is low on
-- stock right now. Keeps the low-stock dashboard query off a sequential scan
-- once the catalogue grows.
CREATE INDEX IF NOT EXISTS "Product_low_stock_idx"
  ON "Product" ("stock")
  WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE';
