import "dotenv/config"

export const config = {
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/postgres",
}
