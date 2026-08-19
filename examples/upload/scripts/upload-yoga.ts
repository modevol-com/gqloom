/// <reference lib="dom" />
import { readFile } from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const endpoint = process.env.UPLOAD_ENDPOINT ?? "http://localhost:4000/graphql"
const fileName = "example.txt"
const filePath = path.resolve(__dirname, fileName)

const operations = JSON.stringify({
  query: /* GraphQL */ `
    mutation ($fileName: String, $file: File!) {
      upload(fileName: $fileName, file: $file)
    }
  `,
  variables: { fileName, file: null },
})

const map = JSON.stringify({ 0: ["variables.file"] })

async function main() {
  const fileBuffer = await readFile(filePath)
  const fileArrayBuffer = new ArrayBuffer(fileBuffer.byteLength)
  new Uint8Array(fileArrayBuffer).set(fileBuffer)

  const formData = new FormData()
  formData.set("operations", operations)
  formData.set("map", map)
  formData.set("0", new Blob([fileArrayBuffer]), fileName)

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Upload failed: ${response.status} ${text}`)
  }

  const result = await response.json()
  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2))
  }

  console.info(result.data.upload)
}

main()
