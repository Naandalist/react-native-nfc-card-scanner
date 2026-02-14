# Design Review: react-native-nfc-card-scanner

> Version 1.0.0 | Author: Listiananda Apriliawan

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Module Breakdown](#module-breakdown)
- [NFC Scanning Flow](#nfc-scanning-flow)
- [EMV TLV Parser](#emv-tlv-parser)
- [APDU Commands](#apdu-commands)
- [Card Data Extraction](#card-data-extraction)
- [Error Handling](#error-handling)
- [Build & Distribution](#build--distribution)
- [Testing Strategy](#testing-strategy)

---

## Overview

`react-native-nfc-card-scanner` is a React Native library that reads contactless payment card data (card number, expiry date, card scheme) via NFC using the EMV contactless protocol. It communicates with cards over ISO-DEP (ISO 14443-4) and parses EMV TLV-encoded responses.

### What It Does

- Scans contactless credit/debit cards via NFC
- Extracts PAN (Primary Account Number) and expiration date
- Auto-detects card scheme (Visa, Mastercard, JCB, Amex, UnionPay, Discover)
- Provides a standalone EMV TLV parser

### What It Does NOT Do

- Does NOT read CVV, PIN, or cardholder name
- Does NOT perform transactions or modify card state
- Does NOT store or transmit card data

---

## Architecture

### High-Level Architecture

```
+------------------------------------------------------------------+
|                     Consumer Application                         |
|                  (React Native App)                               |
+------------------------------------------------------------------+
        |                    |                    |
        v                    v                    v
+----------------+  +----------------+  +------------------+
|   scanNfc()    |  |   stopNfc()    |  | isNfcSupported() |
|   Core Scan    |  |   Cancel Scan  |  | isNfcEnabled()   |
+----------------+  +----------------+  +------------------+
        |
        v
+------------------------------------------------------------------+
|                    Scanner Module (scanner.ts)                    |
|                                                                  |
|  +-------------------+  +------------------+  +---------------+  |
|  | PPSE Selection    |  | AID Detection    |  | PDOL Commands |  |
|  | & Communication   |  | & Scheme Mapping |  | & Data Read   |  |
|  +-------------------+  +------------------+  +---------------+  |
+------------------------------------------------------------------+
        |                          |
        v                          v
+-------------------+    +--------------------+
| react-native-     |    | EMV Module         |
| nfc-manager       |    | (emv/)             |
| (Peer Dependency) |    |                    |
|                   |    | +----------------+ |
| - NfcTech.IsoDep  |    | | TLV Parser     | |
| - isoDepHandler   |    | +----------------+ |
| - transceive()    |    | | Tag Database   | |
|                   |    | | (7400+ entries)| |
+-------------------+    | +----------------+ |
                          | | Hex/Bin Utils  | |
                          | +----------------+ |
                          +--------------------+
```

### Project Structure

```
src/
 |-- index.ts              Public API exports
 |-- scanner.ts            NFC scanning logic, APDU commands, card data extraction
 |-- types.ts              TypeScript interfaces, error constants, type unions
 |-- emv/
 |    |-- index.ts          TLV parser, tag lookup, describe functions
 |    |-- tags.ts           EMV tag database (7400+ lines, all known EMV tags)
 |    |-- utils.ts          Hex/Binary/Decimal conversion utilities
 |-- __tests__/
      |-- scanner.test.ts   Card scheme detection tests
      |-- emv-parser.test.ts TLV parsing tests
      |-- emv-utils.test.ts  Utility function tests
      |-- types.test.ts      Type and error code tests
```

### Dependency Graph

```
index.ts
  |
  +---> scanner.ts
  |       |
  |       +---> emv/index.ts
  |       |       |
  |       |       +---> emv/tags.ts
  |       |       +---> emv/utils.ts
  |       |
  |       +---> types.ts
  |       +---> react-native-nfc-manager (external peer dep)
  |
  +---> emv/index.ts (re-exported as `emv`)
  +---> types.ts (re-exported types & constants)
```

---

## Module Breakdown

### 1. `scanner.ts` - Core NFC Scanner

The main module responsible for the entire card reading flow.

**Key Functions:**

| Function | Visibility | Description |
|---|---|---|
| `scanNfc(options?)` | Public | Entry point. Validates NFC, starts scan with timeout |
| `stopNfc()` | Public | Cancels ongoing scan, releases NFC reader |
| `isNfcSupported()` | Public | Checks device NFC hardware |
| `isNfcEnabled()` | Public | Checks if NFC is enabled |
| `getCardSchemeFromAid(aid)` | Public | Maps AID prefix to card scheme |
| `readCardData()` | Private | Orchestrates the full EMV read flow |
| `extractRecord(type)` | Private | Sends PDOL commands, parses response |
| `flatTLVParser(responses)` | Private | Parses Tag 70 (flat) structure |
| `nestedTLVParser(responses)` | Private | Parses Tag 77 (nested) structure |
| `extractAidTags(hex)` | Private | Regex extraction of AIDs from PPSE response |
| `toByteArray(hex)` | Private | Hex string to byte array conversion |
| `toHexString(bytes)` | Private | Byte array to hex string conversion |

### 2. `emv/index.ts` - EMV TLV Parser

A standalone TLV (Tag-Length-Value) parser for EMV data.

**Public API:**

| Function | Description |
|---|---|
| `emv.parse(data, cb)` | Parse raw hex TLV into EmvObject[] |
| `emv.describe(data, cb)` | Parse + add human-readable tag descriptions |
| `emv.lookup(tag, cb)` | Look up a single tag name |
| `emv.getValue(tag, objects, cb)` | Extract value for a specific tag |
| `emv.getElement(tag, objects, cb)` | Extract full element for a specific tag |
| `emv.describeKernel(data, kernel, cb)` | Parse with kernel-specific lookup |
| `emv.lookupKernel(tag, kernel, cb)` | Look up tag in specific kernel |

### 3. `emv/utils.ts` - Conversion Utilities

Low-level hex/binary/decimal conversion functions used by the TLV parser.

### 4. `emv/tags.ts` - EMV Tag Database

A comprehensive database of 7400+ EMV tag definitions covering multiple kernels (Generic, VISA, MasterCard, JCB, etc.) with tag names, descriptions, formats, and sources.

### 5. `types.ts` - Type Definitions

All TypeScript interfaces, type unions, and error constants.

---

## NFC Scanning Flow

### Complete Sequence Diagram

```
Consumer App          scanNfc()           NfcManager          Payment Card
     |                    |                    |                    |
     |--- scanNfc() ----->|                    |                    |
     |                    |                    |                    |
     |              [Validate NFC]             |                    |
     |                    |--- isSupported --->|                    |
     |                    |<-- true/false -----|                    |
     |                    |--- isEnabled ----->|                    |
     |                    |<-- true/false -----|                    |
     |                    |                    |                    |
     |              [Start NFC Session]        |                    |
     |                    |--- start() ------->|                    |
     |                    |--- registerTag --->|                    |
     |                    |   (NFC-A, NFC-B,   |                    |
     |                    |    skip NDEF,       |                    |
     |                    |    no sounds)       |                    |
     |                    |                    |                    |
     |              [Begin Timeout Race]       |                    |
     |                    |                    |                    |
     |              [readCardData()]           |                    |
     |                    |--- requestTech --->|                    |
     |                    |    (IsoDep)        |--- ISO-DEP ------>|
     |                    |                    |<-- Connected -----|
     |                    |                    |                    |
     |              [Step 1: SELECT PPSE]      |                    |
     |                    |--- transceive ---->|--- APDU --------->|
     |                    |    00A40400...      |    SELECT         |
     |                    |    "2PAY.SYS.DDF01"|    PPSE            |
     |                    |<-- response -------|<-- AIDs list -----|
     |                    |                    |                    |
     |              [Step 2: Extract AID]      |                    |
     |                    |  regex: /4F(..)(hex)/                   |
     |                    |  match AID prefix                      |
     |                    |  --> Card Scheme                       |
     |                    |                    |                    |
     |              [Step 3: SELECT AID]       |                    |
     |                    |--- transceive ---->|--- APDU --------->|
     |                    |    00A40400[aid]    |    SELECT AID     |
     |                    |<-- response -------|<-- ACK ----------|
     |                    |                    |                    |
     |              [Step 4: GET PROCESSING OPTIONS]               |
     |                    |--- transceive ---->|--- APDU --------->|
     |                    |    80A80000...      |    GPO            |
     |                    |<-- response -------|<-- EMV data ------|
     |                    |                    |                    |
     |              [Step 5: Parse EMV]        |                    |
     |                    |  TLV Parser        |                    |
     |                    |  Extract PAN + EXP |                    |
     |                    |                    |                    |
     |              [Cleanup]                  |                    |
     |                    |--- cancelTech ---->|--- Disconnect --->|
     |                    |--- unregister ---->|                    |
     |                    |                    |                    |
     |<-- {card,exp,      |                    |                    |
     |     scheme} -------|                    |                    |
```

### State Machine

```
                    +-------------+
                    |    IDLE     |
                    +------+------+
                           |
                    scanNfc() called
                           |
                           v
                    +------+------+
              +-----|  VALIDATING |-----+
              |     +------+------+     |
              |            |            |
         NFC not      NFC not       NFC OK
         supported     enabled          |
              |            |            v
              v            v     +------+------+
         +----+----+  +---+---+ | REGISTERING  |
         |  ERROR  |  | ERROR | |  TAG EVENT   |
         +---------+  +-------+ +------+------+
                                       |
                                       v
                                +------+------+
                          +-----|   SCANNING   |-----+
                          |     +------+------+     |
                          |            |            |
                     Timeout     Card detected   stopNfc()
                          |            |            |
                          v            v            v
                    +-----+----+ +----+-----+ +----+-----+
                    |  ERROR   | | READING  | | CANCELLED|
                    | TIMEOUT  | |  CARD    | +----------+
                    +----------+ +----+-----+
                                      |
                              +-------+-------+
                              |               |
                         Read OK          Read Failed
                              |               |
                              v               v
                        +-----+----+   +------+-----+
                        |  RESULT  |   |   ERROR    |
                        | {card,   |   | READ_FAILED|
                        |  exp,    |   +------------+
                        |  scheme} |
                        +----------+
```

---

## EMV TLV Parser

### TLV Structure

EMV data is encoded in TLV (Tag-Length-Value) format:

```
+-------+--------+------------------+
|  Tag  | Length  |      Value       |
+-------+--------+------------------+
| 1-3 B | 1-3 B  | Variable length  |
+-------+--------+------------------+
```

### Tag Byte Parsing

```
Tag First Byte Layout:
+---+---+---+---+---+---+---+---+
| 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 |
+---+---+---+---+---+---+---+---+
|Class  |C/P|    Tag Number      |
+-------+---+-------------------+

Class (bits 7-8):
  00 = Universal
  01 = Application
  10 = Context-specific
  11 = Private

C/P (bit 6):
  0 = Primitive (value is raw data)
  1 = Constructed (value contains nested TLV)

Tag Number (bits 1-5):
  If all 1s (11111) --> multi-byte tag, read next byte(s)
  Next byte: bit 8 = 1 means more bytes follow
```

### Length Encoding

```
Short Form (1 byte):
  0x00-0x7F --> Length = value directly
  Example: 08 = 8 bytes

Long Form (2+ bytes):
  First byte: 0x8N where N = number of length bytes that follow
  Example: 81 FF = 255 bytes
  Example: 82 01 00 = 256 bytes
```

### Parsing Flow

```
Input: "6F10840E325041592E5359532E4444463031"

Step 1: Read Tag
  First byte: 6F (binary: 01101111)
  Class: 01 (Application)
  C/P: 1 (Constructed --> value is nested TLV)
  Number: 01111 (not all 1s --> single byte tag)
  Tag = "6F"

Step 2: Read Length
  Byte: 10 (hex) = 16 (dec)
  Short form (< 0x80)
  Length = 16 bytes = 32 hex chars

Step 3: Read Value
  Value = "840E325041592E5359532E4444463031"
  Since tag is Constructed, recursively parse:

    Inner Step 1: Tag = "84"
    Inner Step 2: Length = 0E = 14 bytes
    Inner Step 3: Value = "325041592E5359532E4444463031"
                         = "2PAY.SYS.DDF01" (ASCII)

Result:
  {
    tag: "6F",
    length: "10",
    value: [
      { tag: "84", length: "0E", value: "325041592E5359532E4444463031" }
    ]
  }
```

---

## APDU Commands

### Command Structure

```
APDU Command Format:
+-----+-----+----+----+----+---------+----+
| CLA | INS | P1 | P2 | Lc |  Data   | Le |
+-----+-----+----+----+----+---------+----+
| 1B  | 1B  | 1B | 1B | 1B | Lc bytes| 1B |
+-----+-----+----+----+----+---------+----+

CLA  = Class byte (00 = standard, 80 = proprietary)
INS  = Instruction byte
P1   = Parameter 1
P2   = Parameter 2
Lc   = Length of data field
Data = Command data
Le   = Expected response length
```

### Commands Used

#### 1. SELECT PPSE

```
00 A4 04 00 0E 325041592E5359532E444446303100
|  |  |  |  |  |
|  |  |  |  |  +-- Data: "2PAY.SYS.DDF01" + NULL (ASCII hex-encoded)
|  |  |  |  +-- Lc: 14 bytes of data
|  |  |  +-- P2: 00 (first occurrence)
|  |  +-- P1: 04 (select by DF name)
|  +-- INS: A4 (SELECT)
+-- CLA: 00 (standard)

Purpose: Select the Payment System Environment to discover available AIDs
```

#### 2. SELECT AID (Dynamic)

```
00 A4 04 00 [len] [aid_bytes]

Example for Visa:
00 A4 04 00 07 A0000000031010

Purpose: Select the specific payment application on the card
```

#### 3. GET PROCESSING OPTIONS (Full PDOL)

```
80 A8 00 00 23 83 21 28 00 00 00 00 00 00 00 00 00 00 00 25 00 00 00 00 00 00 09 78 20 05 26 00 E8 DA 93 52 00
|  |  |  |  |  |
|  |  |  |  |  +-- PDOL data (Processing Options Data Object List)
|  |  |  |  +-- Lc: 35 bytes
|  |  |  +-- P2: 00
|  |  +-- P1: 00
|  +-- INS: A8 (GET PROCESSING OPTIONS)
+-- CLA: 80 (proprietary)

Purpose: Request card data using full PDOL for nested (77) template cards
```

#### 4. GET PROCESSING OPTIONS (Short) + READ RECORD

```
Command 1: 80 A8 00 00 02 83 00 00
  Purpose: Basic GPO with minimal PDOL

Command 2: 00 B2 01 14 00
  |  |  |  |  |
  |  |  |  |  +-- Le: 00 (read all)
  |  |  |  +-- P2: 14 (SFI 2, record)
  |  |  +-- P1: 01 (record number 1)
  |  +-- INS: B2 (READ RECORD)
  +-- CLA: 00 (standard)

Purpose: Request card data for flat (70) template cards
```

---

## Card Data Extraction

### Dual Template Support

The library handles two EMV response template structures:

```
Template Type Comparison:

+-----------------------------+-----------------------------+
|      FLAT (Tag 70)          |     NESTED (Tag 77)         |
+-----------------------------+-----------------------------+
|                             |                             |
|  70 [len]                   |  77 [len]                   |
|    |-- 5A [len] [PAN]       |    |-- 57 [len] [Track2]   |
|    |-- 5F24 [len] [EXP]    |    |      |                 |
|    |-- ...other tags        |    |      +-- PAN + D +     |
|                             |    |          YYMM + ...    |
|                             |    |-- ...other tags        |
|                             |                             |
+-----------------------------+-----------------------------+
|                             |                             |
|  PAN Source:                |  PAN Source:                |
|    Tag 5A directly          |    Tag 57, split on 'D',   |
|                             |    take first part          |
|  Expiry Source:             |                             |
|    Tag 5F24 directly        |  Expiry Source:             |
|    Format: YYMMDD           |    Tag 57, after 'D',      |
|                             |    first 4 chars (YYMM)     |
+-----------------------------+-----------------------------+
```

### Extraction Logic Flow

```
extractRecord()
      |
      v
  Send PDOL Commands
      |
      v
  Parse Response with EMV TLV Parser
      |
      v
  Check first tag of parsed result
      |
      +--- Tag == "70" (Flat)
      |         |
      |         v
      |    flatTLVParser()
      |    Find Tag 5A --> card number
      |    Find Tag 5F24 --> expiry (YYMMDD)
      |    Return { card, exp: "MM/YY" }
      |
      +--- Tag == "77" (Nested)
                |
                v
           nestedTLVParser()
           Find Tag 57 --> Track 2 Equivalent Data
           Split value on 'D' separator
           Left side = PAN
           Right side first 4 chars = YYMM
           Return { card, exp: "MM/YY" }

Priority: Flat result preferred if both PAN and EXP are valid,
          otherwise fall back to Nested result.
```

### Card Scheme Detection

```
AID Prefix Mapping:

  AID (hex)         Scheme
  +-----------+     +------------+
  |A000000003 | --> | VISA       |
  |A000000004 | --> | MASTERCARD |
  |A000000065 | --> | JCB        |
  |A000000025 | --> | AMEX       |
  |A000000333 | --> | UNIONPAY   |
  |A000000152 | --> | DISCOVER   |  (Discover Global Network)
  |A000000324 | --> | DISCOVER   |  (Diners Club International)
  |A000000444 | --> | DISCOVER   |  (Older Diners AID)
  |  other    | --> | null       |
  +-----------+     +------------+

Process:
1. PPSE response contains Tag 4F entries (AIDs)
2. Extract AIDs using regex: /4F(..)([A-Fa-f0-9]+)/gi
3. Take first AID found
4. Match prefix against table above
5. Return CardScheme or null
```

---

## Error Handling

### Error Flow Diagram

```
scanNfc()
  |
  +-- isSupported() == false
  |     --> throw NFC_NOT_SUPPORTED
  |
  +-- isEnabled() == false
  |     --> throw NFC_NOT_ENABLED
  |
  +-- Timeout exceeded
  |     --> throw SCAN_TIMEOUT
  |
  +-- readCardData()
        |
        +-- No AID found in PPSE response
        |     --> throw AID_NOT_FOUND
        |
        +-- AID doesn't match any known scheme
        |     --> throw UNSUPPORTED_CARD_SCHEME
        |
        +-- Card data missing (no PAN or EXP)
        |     --> throw CARD_READ_FAILED
        |
        +-- NFC communication error
              --> throw native error (tag lost, etc.)
```

### Error Codes Reference

| Error Code | When | Recovery |
|---|---|---|
| `NFC_NOT_SUPPORTED` | Device has no NFC hardware | Cannot recover; inform user |
| `NFC_NOT_ENABLED` | NFC toggle is off | Prompt user to enable in Settings |
| `SCAN_TIMEOUT` | No card detected within timeout | Retry scan |
| `AID_NOT_FOUND` | PPSE response has no AID tags | Card may not be a payment card |
| `UNSUPPORTED_CARD_SCHEME` | AID prefix not recognized | Card network not supported |
| `CARD_READ_FAILED` | EMV data missing PAN or expiry | Retry, card may be damaged |

### Cleanup Guarantee

```
try {
  // ... scan operations
} finally {
  NfcManager.cancelTechnologyRequest()   // Release IsoDep
  NfcManager.unregisterTagEvent()        // Unregister listener
}
```

The `finally` block ensures NFC resources are always released, even when errors occur or timeout triggers. Both cleanup calls use `.catch(() => {})` to silently handle cases where the resource was already released.

---

## Build & Distribution

### Build Pipeline

```
Source (TypeScript)          Build (tsup)              Output
+------------------+     +-----------------+     +------------------+
| src/index.ts     |     |                 |     | dist/index.js    |  CommonJS
| src/scanner.ts   | --> | tsup            | --> | dist/index.mjs   |  ESM
| src/types.ts     |     | (esbuild-based) |     | dist/index.d.ts  |  Types
| src/emv/         |     |                 |     | dist/index.d.mts |  Types (ESM)
+------------------+     +-----------------+     | dist/*.map       |  Sourcemaps
                                                  +------------------+

Config:
  - Target: ES2020
  - No code splitting (single bundle)
  - react-native-nfc-manager externalized
  - Source maps enabled
```

### Package Distribution

```
Published to npm:          NOT published:
+--------------------+     +--------------------+
| dist/index.js      |     | src/               |
| dist/index.mjs     |     | example/           |
| dist/index.d.ts    |     | node_modules/      |
| dist/index.d.mts   |     | __tests__/         |
| dist/*.map         |     | tsconfig.json      |
| README.md          |     | tsup.config.ts     |
| LICENSE            |     | .gitignore         |
| package.json       |     | vitest.config.*    |
+--------------------+     +--------------------+

Controlled by "files" field in package.json:
  ["dist", "README.md", "LICENSE"]
```

### Module Resolution

```json
{
  "main": "dist/index.js",         // CommonJS entry (require)
  "module": "dist/index.mjs",      // ESM entry (import)
  "types": "dist/index.d.ts",      // TypeScript definitions
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

---

## Testing Strategy

### Test Coverage

```
Test Suites:
+---------------------------+--------------------------------+
| File                      | What it tests                  |
+---------------------------+--------------------------------+
| scanner.test.ts           | Card scheme detection from AID |
|                           | - All 6 card schemes           |
|                           | - Unknown AID handling          |
|                           | - Case insensitivity           |
+---------------------------+--------------------------------+
| emv-parser.test.ts        | TLV parser correctness         |
|                           | - Simple TLV parsing           |
|                           | - Multiple TLV entries         |
|                           | - Nested/constructed tags      |
|                           | - Tag lookup                   |
|                           | - Value/element extraction     |
+---------------------------+--------------------------------+
| emv-utils.test.ts         | Conversion utilities           |
|                           | - Hex/Binary/Decimal           |
|                           | - Padding functions            |
|                           | - Hex to ASCII                 |
+---------------------------+--------------------------------+
| types.test.ts             | Type & constant validation     |
|                           | - NfcError constant values     |
+---------------------------+--------------------------------+

Mocking:
  react-native-nfc-manager is mocked in scanner tests
  since it requires native modules not available in test env.
```

### Running Tests

```bash
yarn test        # vitest run
yarn typecheck   # tsc --noEmit
```
