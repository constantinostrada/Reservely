-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "combination_id" TEXT;

-- CreateIndex
CREATE INDEX "reservations_restaurant_id_combination_id_idx" ON "reservations"("restaurant_id", "combination_id");
