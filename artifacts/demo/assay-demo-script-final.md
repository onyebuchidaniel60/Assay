# Assay Demo Script (final)

**File:** `assay-demo-final.mp4`  
**Target length:** 132 seconds  
**Voice:** Microsoft Edge TTS, `en-US-AndrewNeural` (free, no account)  
**Capture:** real Playwright browser sessions against the local Next.js app backed by the deployed Render API.

## Timeline

| Time | Scene | Narration |
|---|---|---|
| 0:00–0:02.5 | Assay logo/title card | — |
| 0:02.5–0:19.5 | Dashboard, live run register | Assay is a covenant operations workspace for synthetic credit data. It turns a maximum leverage agreement into a reviewable decision trail: source-linked terms, deterministic arithmetic, a compliance proof and a manager decision. |
| 0:19.5–0:32.5 | Facility and encrypted agreement | The analyst starts at the facility. One encrypted agreement, a page-linked review trail, and a redaction step that must be confirmed before any external model sees the text. |
| 0:32.5–1:06.5 | Analysis run: terms, attestation, financials, scenarios, proof | Extraction returns one covenant with its threshold, definitions, permitted add-backs and verbatim evidence. Every extraction is bound to fresh Intel TDX and NVIDIA NRAS attestation, a request nonce and a signed provider response. The analyst confirms the terms. Attested financial inputs are converted to integer minor units and sealed. Decimal arithmetic produces the baseline and two stress scenarios, an independent verifier recomputes the predicate, and a fixed circuit proves the baseline inequality. |
| 1:06.5–1:25 | Manager restricted approval | The manager sees a deliberately restricted view: threshold, proof status and scenario bands, but no raw amounts or named counterparties. Both stress cases breach, so approval requires an explicit risk acknowledgement and a written rationale. |
| 1:25–1:47 | Reppo evaluation detail | Correction feedback can be submitted to Reppo's live Eval Router. Only a 409-byte field-level trace is sent after a 50-kilobyte preflight; the returned score, decision, confidence and route are shown exactly as received. Pending and failed states are never replaced by a fixture verdict. |
| 1:47–1:59 | Auditor chain verification | The auditor verifies the per-borrower signed hash chain and sees the approval evidence, including the exact proof and analysis version. |
| 1:59–2:12 | Integrations status | Provider status stays honest: NEAR AI attested, Kite testnet provider-blocked (exact DNS `ENOTFOUND` / upstream-error evidence, 16 Nov 2026 01:23 UTC), Reppo live. Assay records evidence, not a promise. |

## Caption source

Burned captions are generated from the same narration and are stored in `assay-demo-final.srt`.

## Data shown

Synthetic workspace only: BOR-004, BOR-005, BOR-006, BOR-013 and BOR-018. The manager approves BOR-018 during capture. The Reppo page shows the real provider evaluation `cmwikqtsn000f08l4y73d9a8m`.
