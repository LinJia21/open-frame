import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import fs from "node:fs";
import path from "node:path"; import { fileURLToPath } from "node:url";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../schemas/");
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, strictTypes: false, allowUnionTypes: true });
addFormats(ajv);
for (const f of fs.readdirSync(dir)) ajv.addSchema(JSON.parse(fs.readFileSync(dir + f, "utf8")));
for (const f of fs.readdirSync(dir)) { ajv.getSchema("https://openframe.example/schemas/" + f); console.log("compiled", f); }
const files = process.argv.slice(2); let fail = 0;
const v = ajv.getSchema("https://openframe.example/schemas/bundle.schema.json");
for (const p of files) {
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  if (v(d)) console.log("AJV OK", p); else { fail = 1; console.log("AJV FAIL", p, JSON.stringify(v.errors.slice(0, 15), null, 1)); }
}
process.exit(fail);
