#!/usr/bin/env node

import { spawn } from "child_process"
import * as dotenv from "dotenv"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

// Load .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, "../.env") })

const commands = []

// Check if MySQL URL exists
if (process.env.MYSQL_URL) {
  commands.push("drizzle-kit push --config=drizzle-mysql.config.ts")
}

// Check if PostgreSQL URL exists
if (process.env.POSTGRESQL_URL) {
  commands.push("drizzle-kit push --config=drizzle-postgres.config.ts")
}

// SQLite always executes (no URL required)
commands.push("drizzle-kit push --config=drizzle-sqlite.config.ts")
commands.push("drizzle-kit push --config=drizzle-sqlite-1.config.ts")

// Execute all commands
if (commands.length === 0) {
  process.exit(0)
}

async function runCommands() {
  for (const command of commands) {
    const [cmd, ...args] = command.split(" ")
    await new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: "inherit" })
      child.on("close", (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command failed with code ${code}`))
        }
      })
    })
  }
}

runCommands().catch((error) => {
  console.error("Database push failed:", error.message)
  process.exit(1)
})
