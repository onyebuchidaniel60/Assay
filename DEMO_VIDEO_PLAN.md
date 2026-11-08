# DEMO_VIDEO_PLAN.md — Final product video

## Objective and hard limits

Produce a polished walkthrough of the working product, **maximum 180 seconds; target 120–150 seconds**. It must show real application behavior captured by Playwright or equivalent browser automation using deterministic synthetic data. Do not stage fake success states or narrate features that are not visible and working.

## Proposed story and timing (target 140 seconds)

| Time | On-screen action | Narration purpose |
|---|---|---|
| 0–10s | CovenantOps title and dashboard | Explain the operational problem: contractual covenant compliance is fragmented across agreements, spreadsheets and evidence. |
| 10–28s | Open synthetic borrower/facility; show agreement record | Explain facility onboarding and source-linked covenant terms. |
| 28–48s | Review extracted Debt/EBITDA rule and activate after manager validation | Explain AI proposes; an authorized human validates contractual meaning. |
| 48–68s | Upload synthetic statement; inspect source-linked debt and EBITDA evidence | Explain financial inputs remain traceable to pages/quotes. |
| 68–88s | Run 3.20x deterministic calculation and verified COMPLIANT assessment | Explain deterministic arithmetic and independent verification. |
| 88–104s | Show separate forecast scenario at about 3.63x / AT_RISK | Emphasize forecast risk is not misrepresented as an actual breach. |
| 104–122s | Update evidence to 3.70x, verify BREACHED, create case | Show changed financial facts trigger reassessment and structured investigation. |
| 122–138s | Draft memo, manager approval, then show stale-version invalidation | Explain human authorization and approval binding to evidence version. |
| 138–150s | Audit history/integrity view and closing line | Show evidence/decision chain and core promise. |

Timing may be shortened to keep within 180s. If all actions cannot be shown clearly, prioritize one verified end-to-end scenario over a montage.

## Capture requirements

- Use a fresh browser context and deterministic seeded borrower/facility/docs.
- Use Playwright with fixed viewport (1920×1080 or 1600×900) and capture clean app behavior; also separately validate responsive layout.
- No browser devtools, secrets, API keys, database data, real customer names, personal emails or private console URLs in footage.
- Use the real deployed preview after end-to-end gate. If only local capture is possible due a documented deployment blocker, disclose internally and do not call it a public-demo capture.
- Use stable test fixtures and reset command; record deployed commit and seed version.
- Avoid cursor wandering, long waits, loading stalls and unplanned navigation.

## Narration/TTS procedure

1. Write a 120–150 second narration script tied to visible events; include pronunciation guide for “CovenantOps” and financial terms.
2. At video-production time, verify Google AI voice/TTS availability for the account and region, current free-tier quota, terms, model access, credential scopes and whether usage would create charges. Do not assume availability, unlimited free use or that a pasted key authorizes costs.
3. If Google AI TTS is unavailable within the approved free budget, select a genuinely free permitted fallback. A local Piper option is acceptable only after checking the exact voice/model licence and distribution/use terms. Document the provider, model/voice, licence and reason for fallback.
4. Generate narration in short scene-aligned clips where feasible. Review pronunciation and pacing.
5. Synchronize speech with the matching visible event. Do not describe unseen functionality. Avoid clipped words, long silent gaps, rushed delivery and awkward pauses.
6. Add captions/subtitles where feasible and ensure captions match the final audio.
7. Balance narration and system audio; keep background audio optional and licence-cleared.

## Editing and final quality review

- Use a free permitted editing tool; do not purchase a subscription or stock assets without explicit authority.
- Use clean cuts and concise on-screen labels; avoid unsupported performance claims.
- Redact private URLs, secrets, personal data and any accidental account identifiers.
- Render MP4 H.264/AAC (or broadly compatible equivalent), 1080p preferred.
- Verify total duration <=180 seconds; inspect the entire video and listen to the complete soundtrack.
- Confirm playback, synchronization, caption accuracy, audio levels, no clipping, no hidden secrets and that all narrated features are real.
- Save a copy and checksums after review.

## Output location and files

Use the operator-approved output location recorded in `OPERATOR_INTAKE.md`. Default proposal: `artifacts/demo/`.

```text
artifacts/demo/
  covenantops-demo.mp4
  narration-script.md
  captions.srt                 # when feasible
  capture-playwright.spec.ts    # or equivalent recording script
  production-notes.md
  tts-provider-and-license.md
  review-checklist.md
```

The video is not complete until the rendered file has been reviewed and duration/playback evidence is recorded in `AI_HANDOFF.md` and `docs/BUILD_LOG.md`.
