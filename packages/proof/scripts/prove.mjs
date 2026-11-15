import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const build = resolve(root, "build");

if (!existsSync(resolve(build, "leverage_js/leverage.wasm")) || !existsSync(resolve(build, "leverage_0000.zkey"))) {
  console.error("Compile and set up the circuit first: pnpm --filter @assay/proof run compile && pnpm --filter @assay/proof run setup");
  process.exit(1);
}

const defaults = {
  debt: "3200000000000000",
  adjustedEbitda: "1000000000000000",
  thresholdBps: "35000",
};

const inputPath = process.argv[2];
const input = inputPath
  ? JSON.parse(readFileSync(inputPath, "utf8"))
  : defaults;

const witnessInput = resolve(build, "input.json");
writeFileSync(witnessInput, JSON.stringify(input));

function run(args) {
  const result = spawnSync("pnpm", ["exec", ...args], { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run([
  "snarkjs",
  "groth16",
  "fullprove",
  "build/input.json",
  "build/leverage_js/leverage.wasm",
  "build/leverage_0000.zkey",
  "build/proof.json",
  "build/public.json",
]);
run(["snarkjs", "groth16", "verify", "build/verification_key.json", "build/public.json", "build/proof.json"]);
console.log("Proof generated and verified for the supplied witness.");
