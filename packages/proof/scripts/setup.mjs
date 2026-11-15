import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const build = resolve(root, "build");
const ptau = resolve(build, "pot12_final.ptau");
const zkey = resolve(build, "leverage_0000.zkey");

mkdirSync(build, { recursive: true });

function run(args) {
  const result = spawnSync("pnpm", ["exec", ...args], { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(ptau)) {
  console.log("Generating a local development-only powers-of-tau file. This is not a production ceremony.");
  run(["snarkjs", "powersoftau", "new", "bn128", "12", "build/pot12_0000.ptau", "-v"]);
  run([
    "snarkjs",
    "powersoftau",
    "contribute",
    "build/pot12_0000.ptau",
    "build/pot12_0001.ptau",
    "--name=Assay development contribution",
    `-e=${randomBytes(32).toString("hex")}`,
  ]);
  run(["snarkjs", "powersoftau", "prepare", "phase2", "build/pot12_0001.ptau", "build/pot12_final.ptau", "-v"]);
}

if (!existsSync(zkey)) {
  run(["snarkjs", "groth16", "setup", "build/leverage.r1cs", "build/pot12_final.ptau", "build/leverage_0000.zkey"]);
}
run(["snarkjs", "zkey", "export", "verificationkey", "build/leverage_0000.zkey", "build/verification_key.json"]);
console.log("Development-only circuit setup complete.");
console.log("This is not a production trusted setup; a public ceremony is required before production use.");
