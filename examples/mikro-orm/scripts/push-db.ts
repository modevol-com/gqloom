import { orm } from "../src/provider"

async function main() {
  await orm.schema.update()
  await orm.close()
}

main()
