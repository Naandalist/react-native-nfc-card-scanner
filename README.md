# react-native-nfc-card-scanner

[![npm version](https://img.shields.io/npm/v/react-native-nfc-card-scanner.svg)](https://www.npmjs.com/package/react-native-nfc-card-scanner)
[![license](https://img.shields.io/npm/l/react-native-nfc-card-scanner.svg)](https://github.com/Naandalist/react-native-nfc-card-scanner/blob/main/LICENSE)
![platform](https://img.shields.io/badge/platform-android%20%7C%20ios%20blocked%20by%20Apple-lightgrey.svg)

EMV contactless credit & debit card reader for React Native to extract PAN and expiry via NFC in controlled environments, depending on card issuer policies and device support.

> **Platform Note**: **Android is the supported path.** Apple Core NFC does not support payment-related AIDs, so reading a bank-card PAN on iPhone is generally blocked. Listing Visa/Mastercard AIDs in `Info.plist` does not override that restriction.

Built on top of [`react-native-nfc-manager`](https://github.com/revtel/react-native-nfc-manager).

## Features

- Read EMV contactless payment cards via NFC
- Extract card number (PAN) and expiration date
- Auto-detect card scheme from AID
- Built-in EMV TLV parser
- Supports both flat (tag `70`) and nested (tag `77`) EMV response templates
- TypeScript support with full type definitions

## Supported Card Schemes

| Scheme | AID Prefix |
|--------|-----------|
| Visa | `A000000003` |
| Mastercard | `A000000004` |
| JCB | `A000000065` |
| American Express | `A000000025` |
| UnionPay | `A000000333` |
| Discover / Diners Club | `A000000152`, `A000000324`, `A000000444` |

## Limitations

- Not all cards expose readable PAN data
- Some issuers return masked or partial values
- iOS cannot reliably read payment-card PANs (Core NFC blocks payment AIDs)
- Results depend on region and card configuration

## Installation

```bash
npm install react-native-nfc-card-scanner react-native-nfc-manager
# or
yarn add react-native-nfc-card-scanner react-native-nfc-manager
```

> `react-native-nfc-manager` is a required peer dependency.

## Platform Setup

### Android

Add NFC permission to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.NFC" />
```

### iOS

1. In Xcode, go to your target's **Signing & Capabilities** tab
2. Add the **Near Field Communication Tag Reading** capability
3. Add `NFCReaderUsageDescription` to your `Info.plist`:

```xml
<key>NFCReaderUsageDescription</key>
<string>This app uses NFC to read payment card information</string>
```

4. Add the following to your `Info.plist` to support ISO-DEP:

```xml
<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
<array>
  <string>325041592E5359532E4444463031</string>
  <string>A0000000031010</string>
  <string>A0000000041010</string>
  <string>A000000025010701</string>
  <string>A0000000651010</string>
  <string>A000000333010101</string>
  <string>A0000001523010</string>
</array>
```

Core NFC still ignores payment AIDs. Keep this list only if you are experimenting; do not expect App Store iPhone builds to read credit cards.

## Usage

### Basic Card Scanning

```typescript
import {
  scanNfc,
  stopNfc,
  isNfcSupported,
  isNfcEnabled,
  NfcError,
} from 'react-native-nfc-card-scanner';

async function handleScanCard() {
  try {
    const supported = await isNfcSupported();
    if (!supported) {
      console.log('NFC is not supported on this device');
      return;
    }

    const enabled = await isNfcEnabled();
    if (!enabled) {
      console.log('NFC is disabled. Please enable it in settings.');
      return;
    }

    const result = await scanNfc();
    console.log('Card Number:', result.pan);
    console.log('Masked PAN:', result.maskedPan);
    console.log('Expiry Date:', result.exp);
    console.log('Card Scheme:', result.scheme);
    // const masked = await scanNfc({ timeout: 60000, maskPan: true });
  } catch (error) {
    if (error instanceof Error) {
      console.error('NFC scan failed:', error.message);
    }
  }
}

function handleCancel() {
  stopNfc();
}
```

## API types

```typescript
interface NfcCardResult {
  card: string;         // Same as pan (deprecated alias)
  pan: string;
  maskedPan: string;
  exp: string;
  scheme: CardScheme;
  aid?: string;
}

interface ScanNfcOptions {
  timeout?: number;
  maskPan?: boolean;
}
```

`scanNfc()` still throws `Error` / `NfcScanError` with `error.message` equal to `NfcError.*` codes.

## Example

See [`example/`](example/). Use a physical Android device with NFC.

## How It Works

1. **SELECT PPSE** — Payment System Environment
2. **Extract AIDs** — All Application Identifiers, ranked by known scheme
3. **SELECT AID** — Payment application (with `Le`)
4. **GET PROCESSING OPTIONS** — PDOL (`9F38`) is parsed and GPO is built dynamically
5. **READ RECORD** — Only the SFI/records listed in the AFL
6. **Parse EMV Response** — PAN from `5A` or Track 2 `57`, expiry from `5F24` or `57`

The library only reads the card number (PAN) and expiration date. It does **not** read CVV, PIN, or any security-sensitive data that would allow unauthorized transactions.

## Security & Compliance

This library is intended for use in controlled environments such as internal tools, testing systems, kiosks, or POS-like applications.

It does **not** implement PCI-DSS compliance, encryption, secure storage, or cardholder data protection mechanisms.

See [`SECURITY.md`](SECURITY.md) for full details.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Tracking issue: [#1](https://github.com/Naandalist/react-native-nfc-card-scanner/issues/1).

## Author

**Listiananda Apriliawan** — [naandalist.com](https://naandalist.com/)

## License

[MIT](LICENSE)
