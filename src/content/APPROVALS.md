# Copy approvals

The hero copy, the About copy and the fully finished checklist must be approved by the maintainer before launch, and the checklist also confirmed by the client (it is a promise about what every build includes). Record each approval here, with the date and the version approved (a commit, or the first 12 hex digits of the SHA-256 of the file with LF line endings). Change the copy only in the files listed, and record a new approval when approved copy changes.

| Item | File | Status |
|---|---|---|
| Hero headline and phase lines | `src/components/hero/hero-copy.ts` | Approved by the maintainer |
| About copy | `src/content/about.ts` | Approved by the maintainer |
| Fully finished checklist | `src/content/fully-finished.ts` | Approved by the maintainer and confirmed by the client |

## Log

| Date | Item | Approved by | Version (commit) | Notes |
|---|---|---|---|---|
| 2026-10-31 | Hero headline and phase lines | Maintainer | `hero-copy.ts` sha256 `7d5a60d48b20` | Approved as drafted in the content-pages change |
| 2026-10-31 | About copy | Maintainer | `about.ts` sha256 `cf039cc63e8a` | Approved as drafted |
| 2026-10-31 | Fully finished checklist | Maintainer | `fully-finished.ts` sha256 `337f89d033e5` | Approved as drafted; awaiting the client's confirmation |
| 2026-10-31 | Fully finished checklist | Client (confirmed through the maintainer) | `fully-finished.ts` sha256 `337f89d033e5` | Client confirmed the checklist as drafted |
