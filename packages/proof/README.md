# Assay proof package

Fixed Circom circuit for the MVP maximum leverage predicate:

```text
debt_minor * 10000 <= adjusted_ebitda_minor * threshold_bps
```

Private witness: `debt`, `adjustedEbitda` (integer minor units).
Public signals: `compliant`, `thresholdBps`.

## Commands

```bash
pnpm --filter @assay/proof run compile
pnpm --filter @assay/proof run setup
pnpm --filter @assay/proof run prove
```

`compile` uses the `circom2` WebAssembly compiler. `setup` generates a local
development-only powers-of-tau file and Groth16 verification key. `prove` creates
and verifies a proof for the default 3.20x compliant witness.

## Security boundary

The local setup is a development aid, not a production trusted setup. A public
ceremony and independent review are required before any production claim. The
proof proves only that the supplied witness satisfies the fixed inequality; it
does not prove source-document authenticity or the accuracy of entered figures.
