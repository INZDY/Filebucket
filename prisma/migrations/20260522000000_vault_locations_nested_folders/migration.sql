-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "folderId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_folderId_fkey";

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
