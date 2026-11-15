# Assay — Demo Video Production Plan

**Required output:** actual rendered MP4, no longer than 180 seconds.  
**Target:** 90–150 seconds.  
**Output directory:** `artifacts/demo/`.

## Audience and objective

Audience: hackathon judges and technically informed product reviewers. Explain the real user problem, show the real covenant workflow, make SERV's role visible, prove the arithmetic is deterministic, show proof-gated manager control and demonstrate the audit/privacy boundary. Do not spend time on unsupported claims or feature areas not implemented.

## Storyboard (target 130 seconds)

| Time | Scene | On-screen behavior | Narration intent |
|---|---|---|---|
| 0:00–0:12 | Hook | Real app dashboard and a synthetic credit review queue | “A covenant review is not just a calculation. It is contract interpretation, evidence, controls and sign-off.” |
| 0:12–0:28 | Upload + redaction | Analyst uploads synthetic agreement; redaction results and tokenized preview appear | Explain that identified fields are tokenized before model submission; show the actual result. |
| 0:28–0:52 | SERV + extraction | Show workflow node/status and real extraction evidence quotes/page numbers; show Dolphin provider state accurately | Explain SERV's bounded reasoning role and the provider's extraction task; do not claim unverified privacy guarantees. |
| 0:52–1:12 | Confirm + calculate | Analyst confirms clause terms, enters synthetic figures, calculation results appear | Explain deterministic calculation and the exact supported covenant. |
| 1:12–1:28 | Scenarios + proof | Show baseline and two stress scenarios; show proof verification result | Explain proof proves the fixed inequality, not truth of source figures. |
| 1:28–1:48 | Manager control | Switch to manager account; restricted view; manager approves eligible result and records risk acknowledgement if required | Explain separate manager decision gate; no raw figures shown in manager view. |
| 1:48–2:05 | Audit | Verify chain; demo-only shred if authorized; verify chain again | Explain tamper-evident chain and key deletion without overstating legal erasure. |
| 2:05–2:10 | Close | Brand/summary end card | “Assay: structured covenant analysis, verifiable controls, human authority.” |

If optional Reppo/Kite integrations are genuinely live and provide clear value, replace a short segment or extend within 180 seconds; do not squeeze essential screens or invent live responses. The video may omit an unavailable optional integration.

## Capture rules

- Use Playwright against the deployed preview with a clean browser profile.
- Use deterministic synthetic fixtures and pre-created test accounts with role-specific access.
- Use real application behavior, not static mock screens. If a provider result is fixture-backed, visibly label it `Fixture` in the capture or do not narrate it as live.
- Hide browser bookmarks/password manager, private URLs, console secrets, API keys, customer names and any non-synthetic information.
- Avoid UI states that reveal private raw values while showing the Manager role.
- Capture in 1080p landscape (16:9), stable zoom, no cursor wandering; use a deliberate cursor highlight only if it improves comprehension.

## Voice generation

1. Check current Google AI Studio/Gemini TTS model availability, free-tier quota, terms and usage conditions.
2. Current public pricing indicates a free tier for Gemini TTS, but indicates free-tier input may be used to improve Google products. The narration must therefore contain only public product copy and synthetic examples.
3. Use a natural, professional voice with conversational pacing; adjust pronunciation of “Assay” and technical terms.
4. Do not enable billing or use paid quota without explicit permission.
5. If Google free TTS is unavailable or unsuitable, use a genuinely free local TTS model/tool with a license checked for the voice/model asset. Record exact tool/version/license in production notes.

## Editing and synchronization

- Generate narration in short scene-aligned segments.
- Record the visual clips with timestamps and align each phrase to the relevant action.
- Trim pauses and dead time; leave enough time to inspect key UI states.
- Use understated transitions, legible captions, restrained sound design and consistent audio level.
- No background music is required; any music used must be original or properly licensed.
- Captions in `.srt` or burned-in captions with high contrast and safe margins.

## Render and QA

Output files:
- `artifacts/demo/assay-demo.mp4`
- `artifacts/demo/assay-demo-script.md`
- `artifacts/demo/assay-demo.srt`
- `artifacts/demo/production-notes.md`

Review the complete render from beginning to end. Verify MP4 container, video and audio streams, 16:9 aspect ratio, 1080p target, duration <=180 seconds, narration sync, clear voice, captions, no black gaps, no clipped words, no redacted values/secrets/private URL and no inaccurate claims. Record `ffprobe` output and reviewer checklist in production notes. If a critical flow changes after capture, recapture and rerender.
