const fs = require("node:fs")
const path = require("node:path")

const orgId = process.env.VERCEL_ORG_ID
const projectId = process.env.VERCEL_PROJECT_ID
if (!orgId || !projectId) {
  console.error("Missing VERCEL_ORG_ID or VERCEL_PROJECT_ID")
  process.exit(1)
}

const dist = path.join("website", ".vitepress", "dist")
const vercelDir = ".vercel"
const out = path.join(vercelDir, "output")
const staticDir = path.join(out, "static")

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  console.error(`Missing ${dist}; website build did not produce output`)
  process.exit(1)
}

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
fs.cpSync(dist, staticDir, { recursive: true })
fs.writeFileSync(
  path.join(vercelDir, "project.json"),
  `${JSON.stringify({ orgId, projectId }, null, 2)}\n`
)

const config = {
  version: 3,
  routes: [
    {
      src: "/assets/(.*)",
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
    { handle: "filesystem" },
    { src: "/(.*)", status: 404, dest: "/404.html" },
  ],
}

fs.writeFileSync(
  path.join(out, "config.json"),
  `${JSON.stringify(config, null, 2)}\n`
)
