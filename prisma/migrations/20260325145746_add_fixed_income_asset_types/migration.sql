-- AlterEnum
-- Adding specific fixed income asset types to AssetType enum
ALTER TYPE "AssetType" ADD VALUE 'CDB';
ALTER TYPE "AssetType" ADD VALUE 'RDB';
ALTER TYPE "AssetType" ADD VALUE 'LCI';
ALTER TYPE "AssetType" ADD VALUE 'LCA';
ALTER TYPE "AssetType" ADD VALUE 'TESOURO';
ALTER TYPE "AssetType" ADD VALUE 'POUPANCA';
