import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  verify,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const DEK_BYTES = 32;

export type WrappedKey = {
  version: 1;
  nonce: string;
  tag: string;
  ciphertext: string;
};

export type EncryptedPayload = WrappedKey;

export function generateDek(): Buffer {
  return randomBytes(DEK_BYTES);
}

export function parseKek(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) throw new Error("DATA_KEK_BASE64 must decode to exactly 32 bytes.");
  return key;
}

function encodeWrapped(nonce: Buffer, tag: Buffer, ciphertext: Buffer): WrappedKey {
  return {
    version: 1,
    nonce: nonce.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decodeWrapped(value: WrappedKey): { nonce: Buffer; tag: Buffer; ciphertext: Buffer } {
  const nonce = Buffer.from(value.nonce, "base64");
  const tag = Buffer.from(value.tag, "base64");
  const ciphertext = Buffer.from(value.ciphertext, "base64");
  if (nonce.length !== NONCE_BYTES) throw new Error("Invalid AES-GCM nonce.");
  if (tag.length !== TAG_BYTES) throw new Error("Invalid AES-GCM tag.");
  return { nonce, tag, ciphertext };
}

export function wrapDek(dek: Buffer, kek: Buffer): WrappedKey {
  if (dek.length !== DEK_BYTES) throw new Error("DEK must be 32 bytes.");
  if (kek.length !== 32) throw new Error("KEK must be 32 bytes.");
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, kek, nonce);
  const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
  return encodeWrapped(nonce, cipher.getAuthTag(), ciphertext);
}

export function unwrapDek(wrapped: WrappedKey, kek: Buffer): Buffer {
  const { nonce, tag, ciphertext } = decodeWrapped(wrapped);
  const decipher = createDecipheriv(ALGORITHM, kek, nonce);
  decipher.setAuthTag(tag);
  const dek = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  if (dek.length !== DEK_BYTES) throw new Error("Wrapped DEK did not unwrap to 32 bytes.");
  return dek;
}

export function encryptBytes(plaintext: Uint8Array, dek: Buffer): EncryptedPayload {
  if (dek.length !== DEK_BYTES) throw new Error("DEK must be 32 bytes.");
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, dek, nonce);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  return encodeWrapped(nonce, cipher.getAuthTag(), ciphertext);
}

export function decryptBytes(payload: EncryptedPayload, dek: Buffer): Buffer {
  if (dek.length !== DEK_BYTES) throw new Error("DEK must be 32 bytes.");
  const { nonce, tag, ciphertext } = decodeWrapped(payload);
  const decipher = createDecipheriv(ALGORITHM, dek, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export type AuditKeyPair = {
  privateKeyBase64: string;
  publicKeyBase64: string;
};

export function generateAuditKeyPair(): AuditKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyBase64: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    publicKeyBase64: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
  };
}

export function signAuditHash(hashHex: string, privateKeyBase64: string): string {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return sign(null, Buffer.from(hashHex, "hex"), key).toString("base64");
}

export function verifyAuditSignature(hashHex: string, signatureBase64: string, publicKeyBase64: string): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.from(publicKeyBase64, "base64"),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(hashHex, "hex"), key, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}
