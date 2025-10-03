/*
  Warnings:

  - A unique constraint covering the columns `[email_search_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_search_token" TEXT,
ADD COLUMN     "encryption_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "phone_search_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_search_token_key" ON "users"("email_search_token");

-- CreateIndex
CREATE INDEX "idx_users_email_search" ON "users"("email_search_token");

-- CreateIndex
CREATE INDEX "idx_users_phone_search" ON "users"("phone_search_token");

-- CreateIndex
CREATE INDEX "idx_users_encryption_version" ON "users"("encryption_version");
