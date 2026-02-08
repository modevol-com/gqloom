import { orm } from "../src/provider"

async function main() {
  await orm.schema.updateSchema()
  await orm.close()
}

main()
