# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-11

### Added

- Created dedicated comprehensive architecture SVG diagrams for complex posts:
  - DNS Zero-Downtime Migration (`dns-migration.svg`)
  - AJP Reverse Proxy Architecture (`ajp-proxy-architecture.svg`)
  - Outbox Pattern Architecture (`offline-first-sync-architecture-outbox-pattern.svg`)
  - NFS Share Management Network Segmentation (`nfs-share-management-automation.svg`)
  - Ansible Apache Routing (`ansible-apache-reverse-proxy.svg`)
  - AD Computer Deletion Automation Loop (`automation-loop.svg`)
  - PAM Authentication Flow (`pam-auth-flow.svg`)
- Deepened Layer 7 proxy post with exact Tomcat `server.xml` AJP Connector configuration details.

### Changed

- Enhanced the global Archive search component (`PostSearch.astro`):
  - Refactored matching algorithm to support multi-word "AND" logic query matching instead of strict exact-substrings.
  - Added a search icon inside the input for better UX.
  - Improved "no matches" empty state styling and feedback.
  - Search state now reflects in the URL (`?q=term`) automatically via `replaceState` without triggering page reloads, making search results shareable.
- Sanitized and restructured existing core SVGs (`daily-linux-ops-cheatsheet.svg` and `ansible-vault-python-molecule-snippets.svg`):
  - Stripped out all internal notes ("SHARING NOTE" blocks).
  - Widened global bounding boxes to perfectly contain long command lines without text overflow.
- Replaced generic placeholder SVGs in multiple posts with specific, tailored diagrams.

## [1.1.0] - 2026-03-09

### Added

- Added comprehensive daily Linux ops cheatsheet post.
- Added Azure Provisioned Throughput (PTU) analysis post.
- Added production spotlight for the IntelliFlow App.
- Added Azure PTU decision flow architecture diagram.

### Changed

- Improved recruiter UX and fixed hero animation reflow issues.
- Expanded sanitized operations snippets across multiple posts.

### Fixed

- Downgraded `@eslint/js` to v9 to prevent peer resolution errors in CI.
- Implemented portfolio audit improvements including accessibility (a11y), overall UX, and copy refinements.

## [1.0.2] - 2026-03-05

### Added

- Integrated Issue templates and labeling system into the repository.
- Added full code quality tooling and test infrastructure setup.

### Fixed

- Fixed build pipelines and synchronized content updates.
- Corrected linting errors inside `.astro` pages.
- Routed CV links through a robust language-aware `/cv` resolver.

## [1.0.1] - 2026-03-03

### Added

- Added multi-category support and improved post frontmatter.
- Created IntelliFlow and IntelliAuto showcase posts.

### Changed

- Consolidated duplicate posts and integrated comprehensive guides with SVG diagrams.
- Improved cross-references and categorization for easier navigation.

### Fixed

- Fixed Sidebar navigation to properly use `.includes()` for category filtering.

## [1.0.0] - 2026-02-28

### Added

- **Initial Release:** Complete design overhaul establishing the premium terminal dark theme with canvas background animations.
- Implemented core "Ops Cockpit" and command palette.
- Added boot sequence/startup flow with reliable progression and skip functionality.
- Introduced live network topology panel.
- Bilingual (EN/ES) configuration established natively.
