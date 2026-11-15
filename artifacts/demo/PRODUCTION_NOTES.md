# Assay Demo — Production Notes

**Final file:** `artifacts/demo/assay-demo.mp4`  
**Duration:** 113.5 seconds  
**Resolution:** 1920×1080, 30 fps, H.264 + AAC mono  
**Narration:** local `espeak-ng` (`en-us+f3`, 158 wpm). Google AI TTS was not used because no Google AI/TTS credential or quota is present in this environment; no paid TTS was activated.  
**Data:** synthetic demo workspace only (BOR-004, BOR-005, BOR-006, BOR-013). No real borrower or lender data.

## Capture method

Playwright (`apps/web/tests/demo/record-demo.mjs` and `record-analysis-scene.mjs`) recorded real browser sessions at 1440×900. The local Next.js app was pointed at the deployed Render API (`API_PUBLIC_URL=https://assay-api-7hy0.onrender.com`) so the pages, data, role checks and audit writes are the deployed stack, not mocked UI.

Scenes:

1. Dashboard — real counts and approved runs.
2. Facility — encrypted agreement, document and run scope.
3. Analysis run — terms, source evidence, TDX/NRAS attestation, sealed financials, scenarios and proof.
4. Manager approval — restricted view; both stress cases breach; risk acknowledgement + rationale; real `APPROVE` decision recorded.
5. Auditor — per-borrower chain verification `VALID`, 16 events, approval actor/evidence.
6. Integrations — honest provider state (NEAR AI attested, Kite provider-blocked, Reppo disabled).

The approval is a real mutation: BOR-013 moved from `READY_FOR_MANAGER` to `APPROVED` during capture. The extraction/attestation was run before capture because provider latency is 75 seconds to several minutes; the video shows the resulting evidentiary state, not a fabricated instant response.

## Rebuild

```bash
cd artifacts/demo
bash build-video.sh
```

Prerequisites: the raw scene WebM files (not committed), `ffmpeg`, `espeak-ng`, and the narration text. The script:
- generates the title card;
- normalises each scene to 1080p;
- concatenates video and narration;
- burns `captions.srt` with a readable subtitle style;
- writes `assay-demo.mp4`.

`ffprobe` verified duration `113.5 s`, H.264 High/yuv420p, AAC mono, 1920×1080, 30 fps. Representative frames were extracted and inspected for legibility, role-shaped data and caption overlap.

## Redactions and omissions

- No passwords, API keys, connection strings, tokens or private keys appear.
- No raw debt/EBITDA amounts appear in the manager view.
- No real names or borrower information exist in the dataset.
- The `MC` avatar is the synthetic analyst; audit actor names are synthetic staff.
- Kite is labelled `TESTNET · PROVIDER-BLOCKED`; Reppo is labelled `DISABLED`.

## Honest limitations

- The proof proves the fixed-circuit predicate over the submitted witness; it does not prove that the source figures are accurate.
- Presidio runs in `REDUCED_PII_MODE`; analyst review remains mandatory.
- Render free services can sleep; the extraction worker now wakes the redaction service and retries, but cold starts remain visible.
- Kite x402 remains provider-blocked; no payment or receipt is shown.
- Reppo evaluation remains disabled.
