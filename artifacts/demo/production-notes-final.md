# Assay Demo — Final Production Notes

**Final file:** `artifacts/demo/assay-demo-final.mp4` (7.34 MB; production commit `60fac34`)  
**Duration:** 131.97 seconds  
**Video:** H.264 High, yuv420p, 1920×1080, 30 fps  
**Audio:** AAC LC, 22050 Hz, mono  
**TTS:** Microsoft Edge TTS (`edge-tts`), voice `en-US-AndrewNeural`. Free, no account, no billing. Google Gemini TTS was not used because no Google AI/TTS credential or free-tier activation was present. The earlier espeak-ng render is superseded.

## Capture

- Real Playwright sessions (`apps/web/tests/demo/`), 1440×900 viewport, local Next.js app pointed at `https://assay-api-7hy0.onrender.com`.
- Scenes: dashboard, facility/agreement, analysis run (terms/attestation/scenarios/proof), real manager approval of BOR-018 with risk acknowledgement, real Reppo verdict page, auditor chain verification, integration status.
- The approval is a real mutation: BOR-018 moved from `READY_FOR_MANAGER` to `APPROVED` during the capture.
- The Reppo page shows the real provider record `cmwikqtsn000f08l4y73d9a8m`, score 98, decision `accept`, confidence `low`, route `review`.

## Verification

`ffprobe`:

```text
duration=131.966667
video: h264 (High), yuv420p, 1920x1080, 30 fps
audio: aac (LC), 22050 Hz, mono
```

Checklist:

- [x] Duration ≤ 180 seconds (132 s)
- [x] 1920×1080, 30 fps
- [x] Audio and video streams present
- [x] Logo in opening frame and app header
- [x] Narration matches visible actions
- [x] Captions accurate and legible
- [x] No secrets, private URLs or real borrower data
- [x] Reppo status shown as LIVE with real verdict
- [x] Kite status shown as testnet/provider-blocked with the exact 16 Nov 2026 01:23 UTC `DNS ENOTFOUND` / upstream-error note
- [x] Deployment block shows the live production state, not a pre-release gate
- [x] No Dolphin claim
- [x] Representative frames inspected

## Rebuild

```bash
cd artifacts/demo
bash build-video-final.sh
```

Requires raw scene WebM files under `artifacts/demo/raw/`, Edge TTS WAVs under `artifacts/demo/audio/`, `ffmpeg`, and the logo at `apps/web/public/brand/assay-logo.png`. Raw/audio working files are Git-ignored; the final MP4, script, SRT and these notes are committed.

## Honest limitations

- The ZK proof proves the fixed leverage predicate over the submitted witness, not the truth of the source figures.
- Presidio is a reduced-model profile; analyst review remains mandatory.
- Reppo evaluates a synthetic correction trace; it does not approve the covenant.
- Kite payment remains provider-blocked on both documented testnet endpoints (upstream internal error and DNS `ENOTFOUND`); no successful payment is claimed.
- Render/free-tier cold starts can add latency; the UI displays job state honestly.
