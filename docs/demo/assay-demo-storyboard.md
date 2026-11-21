# Assay — final demo storyboard

All footage is a real 1920×1080 browser recording of the deployed app, except
the closing brand card and the burned-in captions. The Arc explorer shot is a
real crop of the confirmed transaction detail.

| # | Time | Shot | On screen | Operation |
|---|---|---|---|---|
| 1 | 0:00–0:15 | Live dashboard | Overview metrics and run register, slow scroll | Analyst session, `/dashboard` |
| 2 | 0:15–0:30 | Workspace + run register | Dashboard top, then the full analysis-run register | `/dashboard` → `/analysis-runs` |
| 3 | 0:30–0:55 | Completed run | Layer 2 attestation, confirmed financial snapshot, baseline/stress calculation, verified proof, manager approval | `/analysis-runs/fc6362d8…`; continuous scroll |
| 4 | 0:55–1:12 | Audit/privacy | Audit trail header, signed events, redaction and extraction sequence | `/audit?borrower=9042b156…` |
| 5 | 1:12–1:47 | Live external-payment run | Run #2, evidence planner, provider compatibility, quote form, confirmed payment intent with tx hash | `/analysis-runs/856a437a…`; continuous scroll |
| 6 | 1:47–2:03 | Arc explorer | `Transaction details`, `Success`, `transferWithAuthorization`, `0.05 USDC` token transfer | `explorer.arc.io/tx/0xc0a999…`; cropped and enlarged |
| 7 | 2:03–2:25 | Evidence detail | Source URL, retrieval timestamp, raw SHA-256, `VALID`, AAPL facts table | `/analysis-runs/856a437a…`; evidence table |
| 8 | 2:25–2:43 | Chain verification | `Chain verification: VALID`, 32 events checked, payment and evidence rows | `/audit?borrower=5a79c0fb…`; real Verify chain click |
| 9 | 2:43–2:57 | Closing card | Assay logo, tagline, live URL and GitHub | Generated brand card |

## Edit notes

- Scene cuts align exactly with the nine narration segments (15.32, 14.80,
  25.13, 17.22, 34.88, 16.00, 22.04, 18.34 and 13.82 s).
- Captions are short, two-line cues (50 cues) burned at the bottom; they do not
  cover the payment hash, evidence hash or audit result.
- The explorer shot is cropped to `1450×816` and scaled to 1080p so the
  transaction hash and `0.05 USDC` transfer remain readable.
- No blurred secrets, fake cursors, mocked responses or fabricated logs.
- The closing card uses the deployed production URL and the public repository.
