#!/usr/bin/env node
/** Verifies a stored Groth16 proof from stdin without touching the witness. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as snarkjs from "snarkjs";

const here = dirname(fileURLToPath(import.meta.url));
const artifacts = resolve(here, "..", "artifacts");

function readStdin() {
  return new Promise((resolvePromise, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
      if (data.length > 4_000_000) reject(new Error("Proof input is too large."));
    });
    process.stdin.on("end", () => resolvePromise(data));
    process.stdin.on("error", reject);
  });
}

try {
  const { proof, publicSignals } = JSON.parse(await readStdin());
  const verificationKey = JSON.parse(readFileSync(resolve(artifacts, "verification_key.json"), "utf8"));
  const verified = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
  process.stdout.write(JSON.stringify({ verified, publicSignals }));
  process.exit(0);
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : "Proof verification failed.");
  process.exit(1);
}
