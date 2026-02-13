# Changelog

All notable changes to this project will be documented in this file.

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
