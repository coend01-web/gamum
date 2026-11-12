# CAMUM public editorial release — 2026-11-12

## Scope and preservation

User authorized the new main design and existing safe demonstrations, not operational authentication, institutional registration, real applications or payments.

- Development branch: `design/camum-final-main`, based on completed V3 `eeea77654712dddabdce5a6321674a5f587c53c3`.
- Main backup: `backup/main-before-editorial-20261112`, commit `2a624d6fd0a3a4c68c32b2d5c59281c69bbd0ecc`. A local Git bundle is also retained outside the repository.
- Public integration is an allowlisted tree built on main, not a merge of operations/design development history. Original main files remain; original entry is copied byte-for-byte to `legacy.html`.
- Public additions: `home/`, a root entry redirect preserving query/hash, `.nojekyll`, release test/workflow and this report. No `ops/`, Supabase configuration, database migration or private staging data is included.
- Original V3, V2 comparisons, 20 AI source pictures and all 60 JPEG derivatives remain intact on their branches. The 60 public JPEG copies have identical bytes. The 20 themes / 80 manuscript blocks are unchanged.

## Design

Warm ivory, Korean serif type, short gold/tinted 4–5px marks, thin long editorial rules, left text/right sharp photography with edge-only gradients. Four equal routes use original line icons and become a 2×2 grid on mobile. No public gallery or design-review menu.

The minute section uses a complete 3:2 scene beside readable text; mobile stacks both. `object-fit: contain` prevents clipping. The first stage is open, only buttons advance; no timer, autoplay or music. Scripture references use parentheses with a link to CBCK. Small display-only editorial/provenance labels are removed; image provenance is retained in `home/art-v2/manifest.json` and the usage guide. These are AI-created architectural scenes, not photos of actual institutions.

Refresh/new visit now advances a 20-item shuffled bag without consecutive repeats. One selection happens at module load; hash navigation retains it. Explicit `?space=` links open saved spaces and restore per-theme progress in the same tab. Blocked persistent storage falls back to session storage where possible.

## Data boundary

No development DB connection ships. Verified real catalog starts empty with “현재 등록된 모집 일정이 없습니다”. Users can explicitly select clearly labelled fictional demonstrations. Existing qualification-first recommendation, 0–3 results, dates, region and budget filters remain. The exact old v0.2 service retains registration/QR/reviews/results storage demonstrations.

## Completed pre-release verification

- Existing regression, recommendation (176 assertions), six different demo-answer scenarios and all operations unit/local PostgreSQL tests passed. Operations checks do **not** constitute hosted Supabase approval.
- Existing 20-spaces, ART V2 and V3 preservation tests passed.
- New public tests: 200 balanced refreshes, no repeated adjacent theme, explicit saved theme and progress, source-image/content hashes, public dependency isolation, exact legacy preservation and Pages relative paths.
- Browser: 20 themes × 360/390/768/1440 widths; no horizontal overflow or missing hero/minute images. Final mobile layout retested for all 20 themes. Four paths end at or before 795px in tested mobile widths.
- Browser: all 80 reflection stages clicked; matching original text. Both 360px and 1440px 10-question flows completed with three labelled demo results; approved mode correctly gives zero. Mobile question position remained fixed, answer buttons within 671px from screen top.
- Browser: region/date/topic filters, saved retreat, internal theme stability, 40 real reloads covering all 20 themes without adjacent repeats, forced-theme progress after reload, three-step institution registration demonstration. No console errors recorded.
- All 20 Scripture excerpts rechecked against live CBCK chapter HTML on 2026-11-12: exact wording found after removing footnotes and normalizing whitespace. Source URLs remain in the unchanged theme data.
- Desktop/mobile browser viewport testing is not testing on physical phones. Hosted institution login/MFA/permissions, real approved catalog publication and application/payment remain separate unlaunched work.

Live deployment status must be confirmed in GitHub Pages and the actual URL after publishing; pre-release results above do not claim that deployment has already succeeded.

## Rollback

Restore the prior tree with a new revert/restoration commit on main, preserving history. Do not force-reset main. The backup branch and `legacy.html` retain v0.2. No database rollback is necessary because this release does not change any DB or permissions.
