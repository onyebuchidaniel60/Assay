import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const buildDir = resolve(root, "build");
mkdirSync(buildDir, { recursive: true });

const result = spawnSync(
  "pnpm",
  ["exec", "circom2", "circuits/leverage.circom", "--r1cs", "--wasm", "--sym", "-l", "node_modules", "-o", "build"],
  { cwd: root, stdio: "inherit", env: process.env },
);

if (result.status !== 0) {
  console.error("Circuit compilation failed. Ensure circom2 is installed and the circomlib include path is valid.");
  process.exit(result.status ?? 1);
}

console.log("Circuit compiled to packages/proof/build.");
