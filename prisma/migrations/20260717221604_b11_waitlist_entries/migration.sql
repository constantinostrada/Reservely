-- CreateEnum
CREATE TYPE "waitlist_status" AS ENUM ('WAITING', 'PROMOTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_email" TEXT NOT NULL,
    "guest_phone" TEXT,
    "party_size" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "waitlist_status" NOT NULL DEFAULT 'WAITING',
    "promoted_reservation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_entries_restaurant_id_starts_at_status_idx" ON "waitlist_entries"("restaurant_id", "starts_at", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_restaurant_id_status_idx" ON "waitlist_entries"("restaurant_id", "status");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
