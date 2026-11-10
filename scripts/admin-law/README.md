# Administrative litigation learning notes

The public material is `admin-law/`: eight beginner chapters, 32 reading units, 64 original OX questions, a 200-question thematic exam browser (33 groups), supplementary notes, a precedent index, and a statute reference page with seven special-law guides. There are 13 generated HTML pages.

## Update and rebuild

1. Edit `admin-law/content/part01.json` through `part08.json`. Every unit keeps an analogy and its limit separate from the legal explanation. Preserve `admin.partNN.uNN` reading keys. Supplementary notes use stable `admin.review.<supplement-id>` keys; keep these keys and their catalog links stable across rebuilds. The core progress indicator continues to count only the 32 `admin.part*` units.
   Edit `admin-law/content/special-laws.json` for the narrowly scoped special-law explanations and their official sources.
   The three `content/audit-*.json` files map every question and individual statement to a corrected criterion, basic lesson, and supplementary explanation. `sources/exam-choice-index.json` independently inventories all 956 statements/blank items (combination answers are not counted again). Do not mark a source question covered without checking its individual options against the original PDF. Keep official case identities, dates, facts, legal criteria, and case-specific conclusions distinct.
   `content/exam-groups.json` assigns each of the 200 questions to one primary theme. A question may link to supplementary notes from other themes. The default view shows groups, and users can compare up to three questions.
2. Check current official sources before changing legal content. `admin-law/sources/act.json` and `rules.json` are source snapshots. The current act snapshot excludes the maritime-court provisions that take effect on 2028-03-01; article 43 was deleted on 2026-05-12 after the 2022 constitutional decision.
3. Run `node scripts/admin-law/build.cjs`. Generated HTML and the OX YAML are tracked. The shared unit catalog is updated without changing other subjects.
4. Run `node scripts/admin-law/check.cjs` and `node scripts/admin-law/check-ui.cjs`. The checks use the sibling `hoedok-desk/node_modules`. The structural check checks all 956 statement mappings and internal links, requires public disclosure of any direct-case source limitation, and invokes the real app's YAML importer. The UI check opens filters, comparisons, supplements, source previews, and AI dialogs in Chromium and WebKit with mobile/desktop and light/dark variants. It disables account writes and checks the reading bridge in an isolated fixture.
5. Commit and deploy to the repository's existing GitHub Pages `main` branch. Pass the live `.../admin-law/` URL to `check-ui.cjs` for served-page checks.

The original exam PDFs are preserved. `sources/exams.json` records the year, question, original PDF page, primary topic, and related chapter. It is a navigation index, not an official answer key. `prepare-exams.py` is only needed to re-create originals/previews from the local review manifest and user-supplied files; normal builds use the tracked sources.

`sources/qnet-2025-final.json` records the official Q-Net confirmation that 2025 question 72 accepts answers 1 and 4. Its companion image is extracted from the official HWP attachment. The supplementary explanation distinguishes article 37's separate incorporation of article 21 from article 38's list. Historical exam criteria are also separated from the 2026 National Referendum Act rewrite (old article 92 / 100,000 supporters; current article 75 / 200,000 signatures).

Reading completions use the existing account-confirmed `book-reading-v1.js` bridge. Records retain `book: tax`; the dashboard groups `admin.*` unit keys as administrative litigation. Each click creates a durable pending event, and acknowledgments follow the server write. The 64-card YAML is imported through the existing review app rather than silently modifying an account.
