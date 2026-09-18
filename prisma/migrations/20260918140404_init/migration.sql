-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "FundraiserVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "FundraiserStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "groupName" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fundraiser" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "hasGoal" BOOLEAN NOT NULL DEFAULT true,
    "goalAmount" DECIMAL(12,2),
    "visibility" "FundraiserVisibility" NOT NULL DEFAULT 'PUBLIC',
    "hideContributions" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TIMESTAMP(3),
    "photoUrl" VARCHAR(500),
    "emoji" VARCHAR(20),
    "color" VARCHAR(30),
    "shareToken" UUID NOT NULL,
    "status" "FundraiserStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fundraiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" UUID NOT NULL,
    "fundraiserId" UUID NOT NULL,
    "contributorId" UUID,
    "guestName" VARCHAR(150),
    "guestEmail" VARCHAR(255),
    "amount" DECIMAL(12,2) NOT NULL,
    "message" TEXT,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" UUID NOT NULL,
    "fundraiserId" UUID NOT NULL,
    "actorId" UUID,
    "type" VARCHAR(60) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_groupName_idx" ON "Category"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "Fundraiser_shareToken_key" ON "Fundraiser"("shareToken");

-- CreateIndex
CREATE INDEX "Fundraiser_creatorId_status_idx" ON "Fundraiser"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Fundraiser_categoryId_status_idx" ON "Fundraiser"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Fundraiser_visibility_status_createdAt_idx" ON "Fundraiser"("visibility", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Contribution_fundraiserId_status_createdAt_idx" ON "Contribution"("fundraiserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Contribution_contributorId_createdAt_idx" ON "Contribution"("contributorId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_fundraiserId_createdAt_idx" ON "ActivityLog"("fundraiserId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_createdAt_idx" ON "ActivityLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Fundraiser" ADD CONSTRAINT "Fundraiser_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fundraiser" ADD CONSTRAINT "Fundraiser_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "Fundraiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "Fundraiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
