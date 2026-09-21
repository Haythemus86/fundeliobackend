-- AlterTable
ALTER TABLE "Fundraiser" ALTER COLUMN "creatorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AnonymousFundraiserAccess" (
    "id" UUID NOT NULL,
    "fundraiserId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnonymousFundraiserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousFundraiserAccess_fundraiserId_key" ON "AnonymousFundraiserAccess"("fundraiserId");

-- CreateIndex
CREATE INDEX "AnonymousFundraiserAccess_email_idx" ON "AnonymousFundraiserAccess"("email");

-- AddForeignKey
ALTER TABLE "AnonymousFundraiserAccess" ADD CONSTRAINT "AnonymousFundraiserAccess_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "Fundraiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
