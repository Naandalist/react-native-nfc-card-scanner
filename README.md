# react-native-nfc-card-scanner

> This library is a low-level EMV reader, not a payment processing solution.

[![npm version](https://img.shields.io/npm/v/react-native-nfc-card-scanner.svg)](https://www.npmjs.com/package/react-native-nfc-card-scanner)
[![license](https://img.shields.io/npm/l/react-native-nfc-card-scanner.svg)](https://github.com/naandalizt/react-native-nfc-card-scanner/blob/main/LICENSE)
![platform](https://img.shields.io/badge/platform-android%20%7C%20ios--limited-lightgrey.svg)


EMV contactless credit & debit card reader for React Native to extract PAN and expiry via NFC in controlled environments, depending on card issuer policies and device support..

> ⚠️ **Platform Note**: Full support on Android. iOS support is limited by Apple's NFC restrictions and may not work on all devices or regions.

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
- iOS support is restricted by Core NFC policies
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
</array>
```

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
    // Check device capabilities
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

    // Scan the card (default 30s timeout)
    const result = await scanNfc();
    // Or with custom timeout
    // const result = await scanNfc({ timeout: 60000 });

    console.log('Card Number:', result.card);   // e.g. "4111111111111111"
    console.log('Expiry Date:', result.exp);    // e.g. "12/27"
    console.log('Card Scheme:', result.scheme); // e.g. "VISA"
  } catch (error) {
    if (error instanceof Error) {
      console.error('NFC scan failed:', error.message);
    }
  }
}

// To cancel an ongoing scan
function handleCancel() {
  stopNfc();
}
```

### Card Scheme Detection

```typescript
import { getCardSchemeFromAid } from 'react-native-nfc-card-scanner';

const scheme = getCardSchemeFromAid('A0000000031010');
console.log(scheme); // "VISA"
```

### EMV Parser (Standalone)

```typescript
import { emv } from 'react-native-nfc-card-scanner';

// Parse raw EMV TLV data
emv.parse('6F1A840E325041592E5359532E4444463031A5088801025F2D02656E', (result) => {
  console.log(result);
});

// Parse with tag descriptions
emv.describe('6F1A840E325041592E5359532E4444463031A5088801025F2D02656E', (result) => {
  result.forEach((item) => {
    console.log(`${item.tag}: ${item.description} = ${item.value}`);
  });
});
```

## API Reference

### Scanner Functions

#### `scanNfc(options?: ScanNfcOptions): Promise<NfcCardResult>`

Initiates an NFC scan to read a contactless payment card. Handles the full EMV flow: PPSE selection, AID extraction, card scheme detection, and data parsing.

Returns a `NfcCardResult` with card number, expiry, and card scheme. Throws an `Error` if the scan fails (see [Error Handling](#error-handling)).

**Options:**
- `timeout` — Scan timeout in milliseconds (default: `30000`)

#### `stopNfc(): void`

Cancels an ongoing NFC scan and releases the NFC reader.

#### `isNfcEnabled(): Promise<boolean>`

Checks whether NFC is currently enabled on the device.

#### `isNfcSupported(): Promise<boolean>`

Checks whether the device has NFC hardware.

#### `getCardSchemeFromAid(aid: string): CardScheme`

Determines the card network from an Application Identifier (AID) string.

### EMV Parser

#### `emv.parse(data: string, callback: (result: EmvObject[]) => void): void`

Parses raw hex-encoded TLV data into structured `EmvObject` arrays.

#### `emv.describe(data: string, callback: (result: EmvObject[]) => void): void`

Parses TLV data and adds human-readable tag descriptions.

#### `emv.lookup(tag: string, callback: (name: string | undefined) => void): void`

Looks up the name of an EMV tag.

#### `emv.getValue(tag: string, objects: EmvObject[], callback: (value: string | EmvObject[]) => void): void`

Extracts the value for a specific tag from parsed EMV objects.

#### `emv.getElement(tag: string, objects: EmvObject[], callback: (element: EmvObject) => void): void`

Extracts the full element for a specific tag from parsed EMV objects.

### Types

```typescript
interface NfcCardResult {
  card: string;         // Card number (PAN)
  exp: string;          // Expiry date in MM/YY format
  scheme: CardScheme;   // Detected card scheme
}

interface ScanNfcOptions {
  timeout?: number;     // Scan timeout in ms (default: 30000)
}

interface EmvObject {
  tag: string;
  length: string;
  value: string | EmvObject[];
  description?: string;
}

type CardScheme =
  | 'VISA'
  | 'MASTERCARD'
  | 'JCB'
  | 'AMEX'
  | 'UNIONPAY'
  | 'DISCOVER'
  | null;
```

### Constants

```typescript
import { NfcError } from 'react-native-nfc-card-scanner';

// NfcError.NFC_NOT_SUPPORTED
// NfcError.NFC_NOT_ENABLED
// NfcError.AID_NOT_FOUND
// NfcError.UNSUPPORTED_CARD_SCHEME
// NfcError.CARD_READ_FAILED
// NfcError.SCAN_TIMEOUT
```

## Error Handling

`scanNfc()` throws `Error` objects with the following messages:

| Error | Description |
|-------|-------------|
| `NFC_NOT_SUPPORTED` | Device does not have NFC hardware |
| `NFC_NOT_ENABLED` | NFC is disabled in device settings |
| `AID_NOT_FOUND` | No Application Identifier found on the card |
| `UNSUPPORTED_CARD_SCHEME` | Card scheme is not recognized |
| `CARD_READ_FAILED` | Card was detected but data could not be read |
| `SCAN_TIMEOUT` | Scan timed out (default: 30s) |

```typescript
import { scanNfc, NfcError } from 'react-native-nfc-card-scanner';

try {
  const result = await scanNfc();
} catch (error) {
  if (error instanceof Error) {
    switch (error.message) {
      case NfcError.NFC_NOT_SUPPORTED:
        // Handle no NFC hardware
        break;
      case NfcError.NFC_NOT_ENABLED:
        // Prompt user to enable NFC
        break;
      case NfcError.CARD_READ_FAILED:
        // Card detected but couldn't read data
        break;
      case NfcError.SCAN_TIMEOUT:
        // Scan timed out
        break;
      case NfcError.AID_NOT_FOUND:
      case NfcError.UNSUPPORTED_CARD_SCHEME:
        // Card not supported
        break;
      default:
        // Other NFC errors (e.g. user cancelled, tag lost)
        break;
    }
  }
}
```

## Example

A full working example app is available in the [`example/`](example/) directory. It demonstrates scanning a card, displaying results, handling errors, and checking NFC status.

To run the example:

```bash
cd example
npm install

# Android
npx react-native run-android

# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

## How It Works

This library communicates with EMV contactless payment cards using the ISO-DEP (ISO 14443-4) protocol:

1. **SELECT PPSE** - Selects the Payment System Environment on the card
2. **Extract AIDs** - Parses the response to find Application Identifiers
3. **Identify Card Scheme** - Matches AIDs against known card network prefixes
4. **SELECT AID** - Selects the payment application on the card
5. **GET PROCESSING OPTIONS** - Sends PDOL commands to retrieve card data
6. **Parse EMV Response** - Decodes TLV-encoded response to extract card number and expiry

The library only reads the card number (PAN) and expiration date. It does **not** read CVV, PIN, or any security-sensitive data that would allow unauthorized transactions.

## Security & Compliance

This library is intended for use in controlled environments such as internal tools, testing systems, kiosks, or POS-like applications.

It does **not** implement PCI-DSS compliance, encryption, secure storage, or cardholder data protection mechanisms.

Developers are responsible for ensuring that any usage of this library complies with applicable security standards, privacy regulations, and payment network rules.

See [`SECURITY.md`](SECURITY.md) for full details, including what data is read, what is not provided, and recommendations for secure usage.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `yarn test`, `yarn build`, and `yarn typecheck`
5. Commit your changes
6. Push to the branch and open a Pull Request

## Author

**Listiananda Apriliawan** — [naandalist.com](https://naandalist.com/)

## License

[MIT](LICENSE)
