const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const scriptDir = __dirname
const projectRoot = path.join(scriptDir, "..")
const prismaDir = path.join(projectRoot, "prisma")
const schemaPath = path.join(prismaDir, "schema.prisma")
const outputJsonPath = path.join(prismaDir, "CREATE_TABLES.json")
const migrationsDir = path.join(prismaDir, "migrations")
const devDbPath = path.join(prismaDir, "dev.db")

const sql = execSync(
  `pnpm exec prisma migrate diff --from-empty --to-schema-datamodel ${schemaPath} --script`,
  {
    cwd: projectRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }
)

const statements = sql
  .split(";")
  .map((stmt) => {
    return stmt
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim()
  })
  .filter((stmt) => stmt)
fs.writeFileSync(outputJsonPath, JSON.stringify(statements, null, 2), "utf-8")

if (fs.existsSync(migrationsDir)) {
  fs.rmSync(migrationsDir, { recursive: true, force: true })
}

if (fs.existsSync(devDbPath)) {
  fs.unlinkSync(devDbPath)
}

const devDbJournalPath = devDbPath + "-journal"
if (fs.existsSync(devDbJournalPath)) {
  fs.unlinkSync(devDbJournalPath)
}
