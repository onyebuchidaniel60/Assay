import { describe, expect, it } from "vitest";
import {
  decryptBytes,
  encryptBytes,
  generateAuditKeyPair,
  generateDek,
  signAuditHash,
  unwrapDek,
  verifyAuditSignature,
  wrapDek,
} from "../src/index.js";

describe("envelope encryption", () => {
  it("wraps and unwraps a borrower DEK", () => {
    const kek = generateDek();
    const dek = generateDek();
    const wrapped = wrapDek(dek, kek);
    expect(unwrapDek(wrapped, kek).equals(dek)).toBe(true);
  });

  it("encrypts and decrypts bytes with a fresh nonce", () => {
    const dek = generateDek();
    const plaintext = new TextEncoder().encode("synthetic credit agreement");
    const first = encryptBytes(plaintext, dek);
    const second = encryptBytes(plaintext, dek);
    expect(first.nonce).not.toBe(second.nonce);
    expect(new TextDecoder().decode(decryptBytes(first, dek))).toBe("synthetic credit agreement");
  });

  it("fails on tampered ciphertext", () => {
    const dek = generateDek();
    const payload = encryptBytes(new TextEncoder().encode("synthetic"), dek);
    const tampered = { ...payload, ciphertext: Buffer.from("changed").toString("base64") };
    expect(() => decryptBytes(tampered, dek)).toThrow();
  });
});

describe("audit signing", () => {
  it("signs and verifies an audit hash", () => {
    const { privateKeyBase64, publicKeyBase64 } = generateAuditKeyPair();
    const hash = "a".repeat(64);
    const signature = signAuditHash(hash, privateKeyBase64);
    expect(verifyAuditSignature(hash, signature, publicKeyBase64)).toBe(true);
    expect(verifyAuditSignature("b".repeat(64), signature, publicKeyBase64)).toBe(false);
  });
});
