# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-09-09

### Added

- Dynamic GPO from PDOL (`9F38`) and READ RECORD from AFL instead of hardcoded APDUs
- Try every PPSE AID in scheme-priority order
- `NfcScanError` with a typed `code` field (`error.message` stays the same)
- `pan`, `maskedPan`, and optional `aid` on `NfcCardResult`
- `scanNfc({ maskPan: true })`
- NFC permission / Info.plist setup in the example app
- GitHub Actions CI (`test`, `typecheck`, `build`)

### Fixed

- Discover AID matching is now case-insensitive
- Track 2 (`57`) parsing strips `F` padding
- PAN/expiry accepted from either template `70` or `77` (`5A`/`5F24`/`57`)
- Scan timeout timer is cleared on success and on `stopNfc()`
- Android-only `NfcAdapter` reader-mode flags are skipped when unavailable
- SELECT AID now sends `Le` (`00`), consistent with PPSE SELECT
- License badge pointed at a typo GitHub org (`naandalizt`)

### Docs

- README states that Core NFC blocks payment AIDs on iOS
- iOS setup lists PPSE plus common scheme AIDs
- Example README is no longer the stock React Native template

## [1.0.2] - 2026-02-14

### Fixed

- README and package metadata cleanup after the 1.0.0 publish

## [1.0.1] - 2026-02-14

### Fixed

- Patch release after the initial npm publish

## [1.0.0] - 2026-02-14

### Added

- NFC contactless card scanning via ISO-DEP (ISO 14443-4) protocol
- EMV TLV parser with 200+ tag definitions
- Card scheme detection (Visa, Mastercard, JCB, Amex, UnionPay, Discover/Diners Club)
- `scanNfc()` — initiate NFC scan and read card data (PAN, expiry, scheme)
- `stopNfc()` — cancel ongoing NFC scan
- `isNfcEnabled()` — check if NFC is enabled on device
- `isNfcSupported()` — check if device has NFC hardware
- `getCardSchemeFromAid()` — detect card network from AID
- Standalone EMV parser (`emv.parse`, `emv.describe`, `emv.lookup`, `emv.getValue`, `emv.getElement`)
- `NfcError` constant with all error codes (`NFC_NOT_SUPPORTED`, `NFC_NOT_ENABLED`, `AID_NOT_FOUND`, `UNSUPPORTED_CARD_SCHEME`, `CARD_READ_FAILED`, `SCAN_TIMEOUT`)
- Configurable scan timeout via `ScanNfcOptions` (default: 30s)
- Detected card `scheme` included in `NfcCardResult`
- Support for both flat (tag `70`) and nested (tag `77`) EMV response templates
- Full TypeScript support with type definitions
- CommonJS and ES Module output formats
- Unit tests with vitest
- Android and iOS platform support
