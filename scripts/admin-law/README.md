# Administrative litigation learning notes

The public material is `admin-law/`: eight beginner chapters, 32 reading units, 64 original OX questions, a 200-question exam navigation index, a precedent index, and a statute reference page with seven special-law guides.

## Update and rebuild

1. Edit `admin-law/content/part01.json` through `part08.json`. Every unit keeps an analogy and its limit separate from the legal explanation. Preserve `admin.partNN.uNN` reading keys.
   Edit `admin-law/content/special-laws.json` for the narrowly scoped special-law explanations and their official sources.
2. Check current official sources before changing legal content. `admin-law/sources/act.json` and `rules.json` are source snapshots. The current act snapshot excludes the maritime-court provisions that take effect on 2028-03-01; article 43 was deleted on 2026-05-12 after the 2022 constitutional decision.
3. Run `node scripts/admin-law/build.cjs`. Generated HTML and the OX YAML are tracked. The shared unit catalog is updated without changing other subjects.
4. Run `node scripts/admin-law/check.cjs` and `node scripts/admin-law/check-ui.cjs`. The checks use the sibling `hoedok-desk/node_modules`. The structural check invokes the real app's YAML importer.
5. Commit and deploy to the repository's existing GitHub Pages `main` branch. Pass the live `.../admin-law/` URL to `check-ui.cjs` for served-page checks.

The original exam PDFs are preserved. `sources/exams.json` records the year, question, original PDF page, primary topic, and related chapter. It is a navigation index, not an official answer key. `prepare-exams.py` is only needed to re-create originals/previews from the local review manifest and user-supplied files; normal builds use the tracked sources.

Reading completions use the existing account-confirmed `book-reading-v1.js` bridge. Records retain `book: tax`; the dashboard groups `admin.*` unit keys as administrative litigation. Each click creates a durable pending event, and acknowledgments follow the server write. The 64-card YAML is imported through the existing review app rather than silently modifying an account.
