-- Make password optional; add googleId for OAuth
CREATE TABLE "User_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "googleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "User_new" ("id", "email", "password", "googleId", "createdAt")
SELECT "id", "email", "password", NULL, "createdAt" FROM "User";

DROP TABLE "User";
ALTER TABLE "User_new" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
