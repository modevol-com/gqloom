export default [
  'CREATE TABLE "User" (\n    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,\n    "email" TEXT NOT NULL,\n    "name" TEXT\n)',
  'CREATE TABLE "Post" (\n    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,\n    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    "updatedAt" DATETIME NOT NULL,\n    "title" TEXT NOT NULL,\n    "content" TEXT,\n    "published" BOOLEAN NOT NULL DEFAULT false,\n    "viewCount" INTEGER NOT NULL DEFAULT 0,\n    "authorId" INTEGER,\n    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE\n)',
  'CREATE UNIQUE INDEX "User_email_key" ON "User"("email")',
] as const
