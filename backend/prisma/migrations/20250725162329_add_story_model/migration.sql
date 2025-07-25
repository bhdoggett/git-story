-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapters" JSONB NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
