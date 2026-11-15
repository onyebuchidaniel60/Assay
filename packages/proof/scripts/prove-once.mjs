#!/usr/bin/env node
/**
 * One-shot proof worker. Reads the private witness JSON from stdin, generates
 * and verifies a Groth16 proof, writes the proof and public signals to stdout
 * and exits. The witness is never written to disk or passed in argv.
 */
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
      if (data.length > 1_000_000) reject(new Error("Witness input is too large."));
    });
    process.stdin.on("end", () => resolvePromise(data));
    process.stdin.on("error", reject);
  });
}

try {
  const witness = JSON.parse(await readStdin());
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    witness,
    resolve(artifacts, "leverage.wasm"),
    resolve(artifacts, "leverage_final.zkey"),
  );
  const verificationKey = JSON.parse(readFileSync(resolve(artifacts, "verification_key.json"), "utf8"));
  const verified = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
  process.stdout.write(JSON.stringify({ proof, publicSignals, verified }));
  process.exit(0);
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : "Proof generation failed.");
  process.exit(1);
}
