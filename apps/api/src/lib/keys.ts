import { generateDek, parseKek, wrapDek } from "@assay/crypto";
import { borrowerKeys, ensureBorrowerAuditHead, type AssayDb } from "@assay/db";
import { loadBorrowerDek } from "@assay/db";

export async function createBorrowerKey(
  tx: Pick<AssayDb, "insert">,
  organizationId: string,
  borrowerId: string,
): Promise<void> {
  const kekBase64 = process.env.DATA_KEK_BASE64;
  if (!kekBase64) throw new Error("DATA_KEK_BASE64 is required.");
  const dek = generateDek();
  const wrapped = wrapDek(dek, parseKek(kekBase64));
  await tx.insert(borrowerKeys).values({
    borrowerId,
    organizationId,
    wrappedDek: wrapped.ciphertext,
    wrapNonce: wrapped.nonce,
    wrapTag: wrapped.tag,
    keyVersion: 1,
    status: "ACTIVE",
  });
}

export async function initialiseBorrowerAudit(
  tx: Parameters<Parameters<AssayDb["transaction"]>[0]>[0],
  organizationId: string,
  borrowerId: string,
): Promise<void> {
  await ensureBorrowerAuditHead(tx, organizationId, borrowerId);
}

export async function requireBorrowerDek(
  db: AssayDb,
  organizationId: string,
  borrowerId: string,
): Promise<Buffer> {
  return loadBorrowerDek(db, organizationId, borrowerId);
}
