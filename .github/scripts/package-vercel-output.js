const fs = require("node:fs")
const path = require("node:path")

const dist = path.join("website", ".vitepress", "dist")
const out = path.join(".vercel", "output")
const staticDir = path.join(out, "static")

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  console.error(`Missing ${dist}; website build did not produce output`)
  process.exit(1)
}

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
fs.cpSync(dist, staticDir, { recursive: true })

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
