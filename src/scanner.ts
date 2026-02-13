import NfcManager, { NfcTech, NfcAdapter } from 'react-native-nfc-manager';

import emv from './emv';
import {
  CardScheme,
  EmvObject,
  NfcCardResult,
  NfcError,
  ScanNfcOptions,
} from './types';

const DEFAULT_TIMEOUT = 30000;

enum EmvTemplateStructure {
  FLAT = '70',
  NESTED = '77',
}

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

const extractAidTags = (hex: string): string[] => {
  const regex = /4F(..)([A-Fa-f0-9]+)/gi;
  const aids: string[] = [];
  let match;
  while ((match = regex.exec(hex))) {
    if (match[1] && match[2]) {
      aids.push(match[2].substring(0, parseInt(match[1], 16) * 2));
    }
  }
  return aids;
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
    aid.startsWith('A000000152') || // Discover Global Network
    aid.startsWith('A000000324') || // Diners Club International (under Discover)
    aid.startsWith('A000000444') // Older Diners AID
  ) {
    return 'DISCOVER';
  }
  return null;
};

const getEmvInfo = (info: string) => {
  return new Promise<EmvObject[] | null>((resolve) => {
    emv.describe(info, (data) => {
      resolve(data || null);
    });
  });
};

const nestedTLVParser = (responses: EmvObject[]): Omit<NfcCardResult, 'scheme'> | null => {
  const res = responses.find(
    (r) => r.tag === EmvTemplateStructure.NESTED && r.value?.length,
  );
  if (res) {
    const cardInfo = (res.value as EmvObject[]).find(
      (val) => val.tag === '57' && val.value,
    );

    if (cardInfo) {
      const [card, exp] = (cardInfo.value as string).split('D');
      const expDate = exp?.substring(0, 4) ?? '';
      return { card, exp: `${expDate.slice(2)}/${expDate.slice(0, 2)}` };
    }
    return null;
  }
  return null;
};

const flatTLVParser = (responses: EmvObject[]): Omit<NfcCardResult, 'scheme'> | null => {
  const res = responses.find(
    (r) => r.tag === EmvTemplateStructure.FLAT && r.value?.length,
  );
  if (res) {
    const cardNumber = (res.value as EmvObject[]).find(
      (val) => val.tag === '5A',
    );
    const cardExp = (res.value as EmvObject[]).find(
      (val) => val.tag === '5F24',
    );
    const expDate = (cardExp?.value as string)?.substring(0, 4) ?? '';

    return {
      card: (cardNumber?.value as string) ?? '',
      exp: `${expDate.slice(2)}/${expDate.slice(0, 2)}`,
    };
  }

  return null;
};

const extractRecord = async (
  type: EmvTemplateStructure,
): Promise<Omit<NfcCardResult, 'scheme'> | null> => {
  const fullPDOLCommands = [
    '80A800002383212800000000000000000000000000000002500000000000097820052600E8DA935200',
  ];
  const shortenedPDOLCommands = ['80A8000002830000', '00B2011400'];
  const usedCommands =
    type === EmvTemplateStructure.NESTED
      ? fullPDOLCommands
      : shortenedPDOLCommands;

  const responses = [];

  for (let cmd of usedCommands) {
    const resp = await NfcManager.isoDepHandler.transceive(toByteArray(cmd));
    responses.push(resp);
  }

  const lastResp = responses[responses.length - 1];
  if (lastResp) {
    const emvParsed = await getEmvInfo(toHexString(lastResp));

    if (!emvParsed) {
      return null;
    }
    const firstTag = emvParsed ? emvParsed[0] : null;

    if (firstTag?.tag === EmvTemplateStructure.FLAT) {
      return flatTLVParser(emvParsed);
    } else if (firstTag?.tag === EmvTemplateStructure.NESTED) {
      return nestedTLVParser(emvParsed);
    }
  }

  return null;
};

async function readCardData(): Promise<NfcCardResult> {
  try {
    await NfcManager.requestTechnology(NfcTech.IsoDep);

    // Step 1: SELECT PPSE
    const ppseResp = await NfcManager.isoDepHandler.transceive(
      toByteArray('00A404000E325041592E5359532E444446303100'),
    );

    const aidHex = toHexString(ppseResp);
    const aids = extractAidTags(aidHex);
    const selectedAid = aids[0];

    if (!selectedAid) {
      throw new Error(NfcError.AID_NOT_FOUND);
    }
    const scheme = getCardSchemeFromAid(selectedAid);

    if (!scheme) {
      throw new Error(NfcError.UNSUPPORTED_CARD_SCHEME);
    }

    // Step 2: SELECT AID
    const selectAidCmd = `00A40400${(selectedAid.length / 2)
      .toString(16)
      .padStart(2, '0')}${selectedAid}`;
    await NfcManager.isoDepHandler.transceive(toByteArray(selectAidCmd));

    // Step 3: Run Scheme-Specific Commands
    const flatResp = await extractRecord(EmvTemplateStructure.FLAT);
    const nestedResp = await extractRecord(EmvTemplateStructure.NESTED);

    const cardData = flatResp?.card && flatResp?.exp ? flatResp : nestedResp;

    if (!cardData?.card || !cardData?.exp) {
      throw new Error(NfcError.CARD_READ_FAILED);
    }

    return { ...cardData, scheme };
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export const scanNfc = async (
  options?: ScanNfcOptions,
): Promise<NfcCardResult> => {
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT;

  if (!(await NfcManager.isSupported())) {
    throw new Error(NfcError.NFC_NOT_SUPPORTED);
  }

  if (!(await NfcManager.isEnabled())) {
    throw new Error(NfcError.NFC_NOT_ENABLED);
  }

  await NfcManager.start();

  await NfcManager.registerTagEvent({
    isReaderModeEnabled: true,
    readerModeFlags:
      NfcAdapter.FLAG_READER_NFC_A +
      NfcAdapter.FLAG_READER_NFC_B +
      NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK +
      NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
  });

  try {
    const result = await Promise.race([
      readCardData(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(NfcError.SCAN_TIMEOUT)),
          timeoutMs,
        ),
      ),
    ]);

    return result;
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
    NfcManager.unregisterTagEvent().catch(() => {});
  }
};

export const stopNfc = () => {
  NfcManager.cancelTechnologyRequest().catch(() => {});
  NfcManager.unregisterTagEvent().catch(() => {});
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
