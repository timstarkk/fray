-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_persona_id_fkey";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "addressed_persona_id" TEXT,
ADD COLUMN     "addressed_to" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
