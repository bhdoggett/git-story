/*
  Warnings:

  - You are about to drop the column `chapters` on the `Story` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Story" DROP COLUMN "chapters";

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT NOT NULL,
    "userNotes" TEXT,
    "commitShas" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
