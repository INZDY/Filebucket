-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "quotaLimit" DOUBLE PRECISION NOT NULL DEFAULT 10737418240,
    "defaultNoteFont" TEXT NOT NULL DEFAULT 'sans',
    "autosaveDelay" INTEGER NOT NULL DEFAULT 1500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "volumeLevel" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "MediaProgress_userId_idx" ON "MediaProgress"("userId");

-- CreateIndex
CREATE INDEX "MediaProgress_mediaAssetId_idx" ON "MediaProgress"("mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaProgress_userId_mediaAssetId_key" ON "MediaProgress"("userId", "mediaAssetId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProgress" ADD CONSTRAINT "MediaProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProgress" ADD CONSTRAINT "MediaProgress_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
