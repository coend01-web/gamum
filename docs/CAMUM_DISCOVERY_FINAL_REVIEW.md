# CAMUM main design and discovery restoration — 2026-11-13

## Scope and preservation
Base: public main `b3343408f2d32333bc2b54c7d872d9748dba3369`.
Work branch: `design/camum-discovery-final-20261113`.
Backup on GitHub: `backup/main-before-discovery-final-20261113` (same base).
Local verified bundle: `outputs/main-before-discovery-final-20261113.bundle` in the parent workspace.
No operational branch, database, authentication, permissions, credentials, or production data is changed.
Legacy v0.2, original recommendation engine, quiz weights, 20 themes / 80 manuscript blocks and all 60 JPEG assets are byte-preserved. Original full-resolution ART V2 assets and developer comparison pages remain on their existing design branches.

## Root causes
1. The preceding public frontend initialized `rows=[]` and never loaded a public catalog. Its approved-data mode therefore had no real programs to recommend. The engine was not failing: separate fictional data generated 0–3 eligible results. This release explicitly loads a verified static public catalog artifact; it does not pretend to connect a production database.
2. Quiz completion left the module variable `step=10`. Returning home and clicking the quiz called the same renderer with that completed state, repeating the result. Fresh home entry now resets only quiz answers/conditions, not the shelf. Results have a distinct `#quiz-result` route. Browser back edits Q10 with its answer intact; forward returns to the result. Restart begins Q1.
3. The old three search routes reused a single filter form and shared filter state. Each now has independent state and its own primary interaction: fixed topics, month calendar, expandable official areas. Optional conditions are collapsed beneath results.

## Public data audit
Read-only development `public_catalog` response and the public artifact both contain **0 approved public programs / 0 sessions** on 2026-11-13. This does not imply that unpublished operational/test data is absent. No database writes were made.

| Check | Finding / verification |
|---|---|
| Approved public programs | 0 in read-only development public catalog; 0 in release snapshot |
| Real recruitable sessions | 0; correct empty state is shown |
| Program/session relationship | `programId` preserved and fixture-tested; live positive case unavailable |
| Topic classification | 24 independent fixed tags; explicit taxonomy aliases; original v0.2 all-selected AND semantics stated in UI |
| Dates | Korean calendar dates, inclusive multi-day sessions, leap years and month/year boundaries tested |
| Regions | Official legal-area code IDs and hierarchy; no inferred municipality from unknown addresses |
| Audience/age | Original strict engine reused; unknown qualification is not relaxed |
| Recruitment | Real closed/paused/expired states retain status logic; fictional cards never advertise recruiting |
| Recommendation calculation | Original engine unchanged; 176 assertions and six divergent answer sets pass |
| Result rendering | Real empty state + full spiritual guide, separately opted-in fictional 0–3 cards tested |

`home/catalog.json` is an explicitly empty approved-public snapshot, not a live data connection. Publishing real approved announcements requires the separately verified operations-to-public publishing integration. No development key/configuration is bundled.

## Design
The original photographs remain unfiltered. A continuous responsive photograph and gradient replace the former split text panel. Desktop retains four horizontal paths; mobile has four photographic cards in a 2×2 grid. Korean titles lead; thin rules and short gold accents organize sections. There are no inert dots, public 20-theme gallery, or duplicate hero meditation actions.
`home/compositions.json` records focal points, ink/gradient choices and a different existing companion photograph for every theme. These are mood-related fictional spaces, not purported views of the same real facility. The dedicated meditation screen displays each companion at its native 3:2 ratio with `object-fit:contain`; mobile promotional banners deliberately use an atmospheric crop. No new imagery or manuscript was generated.

## Sources
Official regional codes: https://www.code.go.kr/stdcode/regCodeL.do — full legal-area code download, records marked `존재`, checked 2026-11-13. The file contains 16 current top-level regions (including 전남광주통합특별시) and 301 city/district/eup/myeon/dong navigation nodes. Historical province names are explicit aliases. Sejong exposes its actual local administrative units rather than invented districts.
Rebuild helper: `scripts/build-regions.py` with the decoded official tab-separated file. Do not derive regions from current retreat listings.
Bible texts and CBCK chapter URLs retain their preceding verified version without rewriting. No reflection is newly presented as a direct Bible quotation.

## Executed checks
- Existing regression suite: PASS (legacy routes, data, registration, drawer/meditation logic).
- Recommendation v2: PASS, 176 assertions.
- Fictional catalog: PASS, six distinct combinations (rest, scripture, reconciliation, discernment, praise, family), strict conditions and 0–3 results.
- Public integrity: PASS, exact hashes of 80 manuscript blocks / 60 JPEGs / legacy, no development backend, 200 balanced theme rotations.
- New discovery unit suite: PASS, 97 assertions.
- Actual browser: 20 themes × 4 meditation steps clicked; all 80 texts matched existing manuscripts.
- Responsive browser: 20 themes at 360, 390, 768, 1440 CSS pixels; no horizontal overflow or hero-copy escape. Full-page screenshots captured for all 20 at 360px.
- Mobile: all ten answers clicked at 360×800 and 390×844; answer buttons remained in viewport, scroll position stayed at zero, results appeared.
- Actual browser: fresh quiz entry, restart, back/forward, answer editing, real-empty spiritual guide, explicit fictional recommendations, 24-tag toggle/reset, calendar month/day, province/city/gu selection, shelf save, persisted forced-theme meditation progress, internal theme stability and refresh theme change passed.
- Existing three-stage convent registration demonstration: clicked to preview completion. No real submission.
- Loaded visible image resources and browser error log: no failures observed.
- Keyboard tab focus: visible focus outline; native controls and `aria-pressed` / `aria-expanded` states checked.

## Limits / remaining work
No real phone hardware test, full screen-reader audit, or universal photographic contrast certification was performed. Browser-responsive testing is not a physical-device claim. Real program matching was tested with deterministic fixtures because the approved public catalog is empty. No real registration, payment, convent authorization or database publishing is opened by this release. Original development operations and all its data are unchanged.
