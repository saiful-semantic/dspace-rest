# Changelog

All notable changes to this project will be documented in this file.

## [0.0.3] - 2025-05-07
### Added
- CLI (`dspace-cli`) for interacting with DSpace servers from the terminal.
- Support for configuration and credential storage in CLI.
- List, show, update, and move items via CLI and API.
- List, create, and delete collections via CLI and API.
- Bitstream management: add, list, and delete bitstreams via CLI and API.
- Batch delete of bitstreams by item (excluding LICENSE bundle).
- Support for both CommonJS and ES Module builds.
- TypeScript types for all major DSpace entities (Community, Collection, Item, Bundle, Bitstream).
- Example usage and CLI documentation in README.

### Changed
- Improved error handling and debug output for API and CLI operations.
- Modularized codebase for easier maintenance and extension.

### Fixed
- Various bug fixes and improved test coverage for authentication, item, collection, bundle, and bitstream operations.

---

## [0.0.2] - 2024-xx-xx
- Internal pre-release, first version published to npm.

## [0.0.1] - 2024-xx-xx
- Initial development version.
