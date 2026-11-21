# Final demo production notes

## Output

- `docs/demo/assay-demo-final.mp4`
- Public release asset: https://github.com/onyebuchidaniel60/Assay/releases/download/demo-final-2026-11-21/assay-demo-final.mp4 (verified HTTP 200, 30,549,015 bytes)
- 1920×1080, 30 fps, H.264 High/yuv420p, AAC mono 48 kHz
- 177.546 s (2:57.5), 30.5 MB
- `docs/demo/assay-demo-captions.srt` — 50 short caption cues
- `docs/demo/assay-demo-script.md`
- `docs/demo/assay-demo-storyboard.md`

## Narration

- Provider: **ElevenLabs**
- Model: **`eleven_v4`** (present in the account model list)
- Voice: **George - Warm, Captivating Storyteller** (`JBFqnCBsd6RMkjVDRZzb`)
- The operator's original configured voice ID was not present in the account
  (`voice_not_found`). The operator approved using an available voice; George
  was selected and used for every segment.
- Nine segments were generated separately for accurate scene synchronization.
- Voice settings: stability 0.45, similarity 0.78, style 0.28, speaker boost on.
- Output format: `mp3_44100_128`.
- Successful test generation preceded the final nine segments.

## Secret handling

- API key and voice configuration are stored outside Git at
  `/root/assay-secrets/elevenlabs.env` (mode 600).
- `.env.example` contains empty placeholders only.
- The key is never printed, logged, shown in screenshots, included in the video,
  committed, or read by the application runtime.
- The narration script refuses to run if the key or voice ID is missing.
- Authentication errors (401/403) and invalid requests (400) are not retried.
  Transient 429/5xx/network failures retry at most three times with backoff.
- Successful MP3s are cached by SHA-256 of text + voice + model + settings, so
  editing one scene does not regenerate the others.

## Assembly

1. Generate/cache narration:
   `node artifacts/demo/elevenlabs-narration.mjs`
2. Normalize and prepare audio, timing and captions:
   `node artifacts/demo/prepare-narration-v3.mjs`
3. Generate short caption cues:
   `node artifacts/demo/make-captions-v3.mjs`
4. Record real 1080p footage:
   `cd apps/web && xvfb-run -a node ../../artifacts/demo/record-final-v3.mjs`
5. Render:
   `bash artifacts/demo/build-video-v3.sh`

The recording script uses authenticated, headed Chromium sessions and the real
deployed application. The payment click is not re-enacted; the confirmed result
and the onchain transaction are shown as they exist.

## Audio and synchronization checks

- Audio decoded successfully: mono, 48 kHz, 177.546 s.
- Loudness: mean −17.1 dB, peak −1.5 dB; no clipping.
- Each narration segment is cut-aligned with its video scene; scene boundaries
  match the manifest timings exactly.
- The complete render was inspected at ten-second intervals and at each scene
  boundary. The payment hash, evidence SHA-256, `VALID:32` banner and `0.05
  USDC` explorer row were checked for legibility.
- Captions were rebuilt after an initial decimal-splitting bug so `0.05 USDC`
  is never broken across cues.

## Honest limitations

- The live payment had already settled before recording. The video shows the
  real confirmed intent and explorer transaction; it does not claim to show a
  new payment being made during the recording.
- The workspace is synthetic; the LoneStar data is public-company market data,
  not an audited statement or proof of a private borrower's position.
- The audit chain is signed and tamper-evident, not an immutable public ledger.
- No ElevenLabs key, payer key, session cookie or private URL appears in the
  footage.
