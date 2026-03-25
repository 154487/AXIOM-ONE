-- AlterTable: add indexer and rate columns to Asset
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "indexer" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "rate" DECIMAL(8,4);
