import NfcManager, { NfcTech, NfcAdapter } from 'react-native-nfc-manager';

import emv from './emv';
import {
  CardScheme,
  EmvObject,
  NfcCardResult,
  NfcError,
  NfcScanError,
  ScanNfcOptions,
} from './types';

const DEFAULT_TIMEOUT = 30000;

const PPSE_AID = '325041592E5359532E4444463031';

/** Dummy terminal values used only to satisfy GPO. Not a real transaction. */
const PDOL_DEFAULTS: Record<string, string> = {
  '9F66': '26000000',
  '9F02': '000000000000',
  '9F03': '000000000000',
  '9F1A': '0360',
  '95': '0000000000',
  '5F2A': '0360',
  '9A': '260101',
  '9C': '00',
  '9F37': '01020304',
  '9F35': '22',
  '9F33': 'E0F8C8',
  '9F40': 'F000F0A001',
  '9F6A': '00000000',
  '9F7C': '0000000000000000000000000000000000000000',
  '9F4E': '00000000',
  '9F6E': '00000000',
};

let scanTimeoutId: ReturnType<typeof setTimeout> | undefined;

const toByteArray = (hexString: string): number[] => {
  const byteArray: number[] = [];
  const normalizedHexString =
    hexString.length % 2 === 0 ? hexString : '0' + hexString;
  for (let i = 0; i < normalizedHexString.length; i += 2) {
    const byteValue = parseInt(normalizedHexString.substring(i, i + 2), 16);
    if (!isNaN(byteValue)) {
      byteArray.push(byteValue);
    }
  }
  return byteArray;
};

const toHexString = (byteArray: number[]): string => {
  return byteArray.reduce((acc, byte) => {
    const hex = ('00' + byte.toString(16).toUpperCase()).slice(-2);
    return acc + hex;
  }, '');
};

const stripStatusWord = (hex: string): string => {
  const upper = hex.toUpperCase();
  if (upper.length >= 4 && /^(9000|61[0-9A-F]{2}|6C[0-9A-F]{2})$/.test(upper.slice(-4))) {
    return upper.slice(0, -4);
  }
  return upper;
};

const parseTlv = (hex: string): Promise<EmvObject[]> => {
  return new Promise((resolve) => {
    emv.parse(stripStatusWord(hex), (data) => {
      resolve(data || []);
    });
  });
};

export const extractAidTags = (hex: string): string[] => {
  const regex = /4F([0-9A-Fa-f]{2})/gi;
  const aids: string[] = [];
  let match;
  while ((match = regex.exec(hex))) {
    const length = parseInt(match[1], 16);
    if (!length || Number.isNaN(length)) {
      continue;
    }
    const start = match.index + 4;
    const aid = hex.substring(start, start + length * 2);
    if (aid.length === length * 2) {
      aids.push(aid.toUpperCase());
    }
  }
  return [...new Set(aids)];
};

export const getCardSchemeFromAid = (aid: string): CardScheme => {
  const aidUpper = aid.toUpperCase();
  if (aidUpper.startsWith('A000000003')) {
    return 'VISA';
  }
  if (aidUpper.startsWith('A000000004')) {
    return 'MASTERCARD';
  }
  if (aidUpper.startsWith('A000000065')) {
    return 'JCB';
  }
  if (aidUpper.startsWith('A000000025')) {
    return 'AMEX';
  }
  if (aidUpper.startsWith('A000000333')) {
    return 'UNIONPAY';
  }
  if (
    aidUpper.startsWith('A000000152') ||
    aidUpper.startsWith('A000000324') ||
    aidUpper.startsWith('A000000444')
  ) {
    return 'DISCOVER';
  }
  return null;
};

const findTagValue = (
  objects: EmvObject[],
  tag: string,
): string | EmvObject[] | undefined => {
  for (const item of objects) {
    if (item.tag.toUpperCase() === tag.toUpperCase()) {
      return item.value;
    }
    if (Array.isArray(item.value)) {
      const nested = findTagValue(item.value, tag);
      if (nested !== undefined) {
        return nested;
      }
    }
  }
  return undefined;
};

export const parseTrack2Equivalent = (
  value: string,
): { card?: string; exp?: string } => {
  const cleaned = value.toUpperCase().replace(/F+$/g, '');
  const sep = cleaned.indexOf('D');
  if (sep === -1) {
    return {};
  }
  const card = cleaned.slice(0, sep).replace(/[^0-9]/g, '');
  const yymm = cleaned.slice(sep + 1, sep + 5);
  const exp =
    yymm.length === 4 ? `${yymm.slice(2)}/${yymm.slice(0, 2)}` : undefined;
  return { card: card || undefined, exp };
};

export const parseExpiryTag = (value: string): string | undefined => {
  const yymm = value.toUpperCase().replace(/F+$/g, '').slice(0, 4);
  if (yymm.length !== 4 || /[^0-9]/.test(yymm)) {
    return undefined;
  }
  return `${yymm.slice(2)}/${yymm.slice(0, 2)}`;
};

export const maskPan = (pan: string): string => {
  if (pan.length < 8) {
    return pan;
  }
  return `${pan.slice(0, 4)}${'*'.repeat(pan.length - 8)}${pan.slice(-4)}`;
};

export const extractCardFields = (
  objects: EmvObject[],
): { card?: string; exp?: string } => {
  const panTag = findTagValue(objects, '5A');
  const expTag = findTagValue(objects, '5F24');
  const track2 = findTagValue(objects, '57');

  let card = typeof panTag === 'string' ? panTag.replace(/F+$/i, '') : undefined;
  let exp = typeof expTag === 'string' ? parseExpiryTag(expTag) : undefined;

  if (typeof track2 === 'string') {
    const parsed = parseTrack2Equivalent(track2);
    if (!card && parsed.card) {
      card = parsed.card;
    }
    if (!exp && parsed.exp) {
      exp = parsed.exp;
    }
  }

  return { card, exp };
};

export interface PdolItem {
  tag: string;
  length: number;
}

export const parsePdol = (pdolHex: string): PdolItem[] => {
  const hex = pdolHex.toUpperCase();
  const items: PdolItem[] = [];
  let i = 0;

  while (i + 2 <= hex.length) {
    let tag = hex.substring(i, i + 2);
    i += 2;
    const first = parseInt(tag, 16);
    if (!Number.isNaN(first) && (first & 0x1f) === 0x1f && i + 2 <= hex.length) {
      tag += hex.substring(i, i + 2);
      i += 2;
    }
    if (i + 2 > hex.length) {
      break;
    }
    const length = parseInt(hex.substring(i, i + 2), 16);
    i += 2;
    if (Number.isNaN(length)) {
      break;
    }
    items.push({ tag, length });
  }

  return items;
};

export const buildPdolData = (pdolHex?: string): string => {
  if (!pdolHex) {
    return '';
  }
  return parsePdol(pdolHex)
    .map(({ tag, length }) => {
      const fallback = '00'.repeat(length);
      const preset = PDOL_DEFAULTS[tag] ?? fallback;
      return preset.padEnd(length * 2, '0').slice(0, length * 2);
    })
    .join('');
};

export const buildGpoCommand = (pdolData: string): string => {
  if (!pdolData) {
    return '80A8000002830000';
  }
  const data = `83${(pdolData.length / 2).toString(16).padStart(2, '0')}${pdolData}`;
  const lc = (data.length / 2).toString(16).padStart(2, '0');
  return `80A80000${lc}${data}00`.toUpperCase();
};

export interface AflEntry {
  sfi: number;
  first: number;
  last: number;
}

export const parseAfl = (aflHex: string): AflEntry[] => {
  const hex = aflHex.toUpperCase();
  const entries: AflEntry[] = [];
  for (let i = 0; i + 8 <= hex.length; i += 8) {
    const sfi = parseInt(hex.substring(i, i + 2), 16) >> 3;
    const first = parseInt(hex.substring(i + 2, i + 4), 16);
    const last = parseInt(hex.substring(i + 4, i + 6), 16);
    if (sfi > 0 && first > 0 && last >= first) {
      entries.push({ sfi, first, last });
    }
  }
  return entries;
};

export const buildReadRecordCommand = (sfi: number, record: number): string => {
  const p1 = record.toString(16).padStart(2, '0');
  const p2 = ((sfi << 3) | 0x04).toString(16).padStart(2, '0');
  return `00B2${p1}${p2}00`.toUpperCase();
};

const buildSelectCommand = (aidHex: string): string => {
  const lc = (aidHex.length / 2).toString(16).padStart(2, '0');
  return `00A40400${lc}${aidHex}00`.toUpperCase();
};

const transceiveHex = async (command: string): Promise<string> => {
  const resp = await NfcManager.isoDepHandler.transceive(toByteArray(command));
  return toHexString(resp);
};

const collectFromResponse = async (
  hex: string,
  bucket: EmvObject[],
): Promise<{ aip?: string; afl?: string }> => {
  const parsed = await parseTlv(hex);
  bucket.push(...parsed);

  const template80 = findTagValue(parsed, '80');
  if (typeof template80 === 'string' && template80.length >= 4) {
    return {
      aip: template80.slice(0, 4),
      afl: template80.slice(4),
    };
  }

  const aip = findTagValue(parsed, '82');
  const afl = findTagValue(parsed, '94');
  return {
    aip: typeof aip === 'string' ? aip : undefined,
    afl: typeof afl === 'string' ? afl : undefined,
  };
};

const readApplication = async (
  aid: string,
): Promise<Omit<NfcCardResult, 'scheme' | 'maskedPan'> | null> => {
  const selectResp = await transceiveHex(buildSelectCommand(aid));
  const fci = await parseTlv(selectResp);
  const pdol = findTagValue(fci, '9F38');
  const pdolHex = typeof pdol === 'string' ? pdol : undefined;

  const records: EmvObject[] = [...fci];
  const gpoResp = await transceiveHex(buildGpoCommand(buildPdolData(pdolHex)));
  const { afl } = await collectFromResponse(gpoResp, records);

  if (afl) {
    for (const entry of parseAfl(afl)) {
      for (let record = entry.first; record <= entry.last; record += 1) {
        const recHex = await transceiveHex(
          buildReadRecordCommand(entry.sfi, record),
        );
        await collectFromResponse(recHex, records);
      }
    }
  }

  const fields = extractCardFields(records);
  if (!fields.card || !fields.exp) {
    return null;
  }

  return { card: fields.card, pan: fields.card, exp: fields.exp, aid };
};

async function readCardData(): Promise<Omit<NfcCardResult, 'maskedPan'>> {
  try {
    await NfcManager.requestTechnology(NfcTech.IsoDep);

    const ppseResp = await transceiveHex(buildSelectCommand(PPSE_AID));
    const aids = extractAidTags(ppseResp);

    if (!aids.length) {
      throw new NfcScanError(NfcError.AID_NOT_FOUND);
    }

    const ranked = [
      ...aids.filter((aid) => getCardSchemeFromAid(aid)),
      ...aids.filter((aid) => !getCardSchemeFromAid(aid)),
    ];

    let lastUnsupported = false;

    for (const aid of ranked) {
      const scheme = getCardSchemeFromAid(aid);
      if (!scheme) {
        lastUnsupported = true;
        continue;
      }

      try {
        const cardData = await readApplication(aid);
        if (cardData?.card && cardData.exp) {
          return { ...cardData, scheme };
        }
      } catch {
        // Try the next AID when this application rejects GPO / records.
      }
    }

    if (lastUnsupported && ranked.every((aid) => !getCardSchemeFromAid(aid))) {
      throw new NfcScanError(NfcError.UNSUPPORTED_CARD_SCHEME);
    }

    throw new NfcScanError(NfcError.CARD_READ_FAILED);
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

const releaseNfc = () => {
  if (scanTimeoutId) {
    clearTimeout(scanTimeoutId);
    scanTimeoutId = undefined;
  }
  NfcManager.cancelTechnologyRequest().catch(() => {});
  NfcManager.unregisterTagEvent().catch(() => {});
};

export const scanNfc = async (
  options?: ScanNfcOptions,
): Promise<NfcCardResult> => {
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT;

  if (!(await NfcManager.isSupported())) {
    throw new NfcScanError(NfcError.NFC_NOT_SUPPORTED);
  }

  if (!(await NfcManager.isEnabled())) {
    throw new NfcScanError(NfcError.NFC_NOT_ENABLED);
  }

  await NfcManager.start();

  const androidReaderOptions =
    NfcAdapter &&
    typeof NfcAdapter.FLAG_READER_NFC_A === 'number'
      ? {
          isReaderModeEnabled: true,
          readerModeFlags:
            NfcAdapter.FLAG_READER_NFC_A +
            NfcAdapter.FLAG_READER_NFC_B +
            NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK +
            NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
        }
      : undefined;

  await NfcManager.registerTagEvent(androidReaderOptions);

  try {
    const result = await Promise.race([
      readCardData(),
      new Promise<never>((_, reject) => {
        scanTimeoutId = setTimeout(() => {
          reject(new NfcScanError(NfcError.SCAN_TIMEOUT));
        }, timeoutMs);
      }),
    ]);

    const pan = options?.maskPan ? maskPan(result.card) : result.card;
    return {
      ...result,
      card: pan,
      pan,
      maskedPan: maskPan(result.card),
    };
  } finally {
    releaseNfc();
  }
};

export const stopNfc = () => {
  releaseNfc();
};

export const isNfcEnabled = async (): Promise<boolean> => {
  try {
    return await NfcManager.isEnabled();
  } catch {
    return false;
  }
};

export const isNfcSupported = async (): Promise<boolean> =>
  NfcManager.isSupported();
