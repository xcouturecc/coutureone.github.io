# Performance and verification

Compared with typography checkpoint `ce3dcfc`:

| Measure | Before | After |
| --- | ---: | ---: |
| JavaScript on a normal page, uncompressed | 274,638 bytes | 26,182 bytes |
| Optimized images, sum of default largest versions | 13,016,978 bytes | 4,526,359 bytes |
| Article content in the HTML response | Empty shell | Complete article |
| GitHub API dependency for reading articles | Required | None |

Normal-page JavaScript decreased by 90.5%; processed default
image bytes decreased by 65.2%. These are resource-size measurements,
not a claim that real-world load time improved by the same percentage. Phone
browsers can select smaller 800px images. 1 image remains external.

Verification completed locally:

- Six unit tests: generation, title escaping, ownership filtering, Mermaid
  extraction, responsive images, API failure and failed output publication.
- Route tests: old post/home links, double-base64 pagination cursors, and
  ordinary heading anchors.
- All 52 generated HTML pages: local links, local assets, canonical metadata,
  complete article markup, image dimensions, no public API credentials.
- Browser: homepage and pagination, article navigation, 390px phone layout and
  1440px desktop layout without horizontal overflow, local responsive images,
  light/dark theme and persistence, original back-arrow icon with no added text.
- Browser: Mermaid rendering/zoom/fullscreen entry and restoration; one diagram
  script on a diagram page and none on a regular article.
- Browser: two real comments loaded only after View Comments was pressed;
  Markdown formatting and avatars retained.

The public Issues API was used for the final build, producing 43 article pages
and 9 listing pages. Real-world network timings were not measured.
Vercel project details/deployment inspection returned HTTP 403 for the connected
account's team scope, so production deployment/rollback has not been verified.
No production deployment was changed.

Source rollback is tested separately in an isolated checkout; see ROLLBACK.md.
After merging/deploying this branch, the scheduled workflow checks for new content
every 30 minutes (GitHub may delay scheduled jobs). Manual workflow dispatch
updates sooner. Writing and commenting still happen in GitHub Issues.

## Production deployment — 2026-10-05

The verified version was pushed to main and Vercel reported READY. Production
aliases include blog.xcouture.cc. Project/deployment access succeeded without
an explicit team scope, resolving the earlier 403 limitation. The initial
Refresh static blog workflow completed successfully, including route tests,
unit tests, generation, and validation of all generated pages. The previous
production deployment and both source tags were saved before publishing.

## Original layout restoration — 2026-10-07

Restored original Mirror homepage structure, direct pagination buttons, label
`#` prefixes, footer placement, title/date colors, and opacity. Removed added
article typography, spacing, image rounding, and moved back-arrow styles.
Local font stacks, static HTML, responsive images, and native scrolling remain.

Reference: inline theme CSS from pre-optimization commit `fb49d1b`, original
compiled base styles, and markup checked against Mirror's templates. The reference
uses current content and optimized images, with native scrolling for measurement;
it is not a historical screenshot. Browser comparisons found no differences in
measured positions, dimensions, fonts, line heights, colors, padding, or margins
for 11 homepage elements at 1280px in light/dark mode and 390px in dark mode,
and 7 article elements at 1280px. Pagination, scrolling, two loaded comments,
all 52 generated pages, unit tests and legacy route tests passed.

Pre-release rollback tag: `rollback/before-full-layout-restore` (`f76d343`).
Previous production: `dpl_FGRFDSBLLFvHhV9eh3yqk33HLFfa`.
