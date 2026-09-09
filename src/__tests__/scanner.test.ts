import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native-nfc-manager', () => ({
  default: {},
  NfcTech: {},
  NfcAdapter: {},
}));

import {
  getCardSchemeFromAid,
  extractAidTags,
  parseTrack2Equivalent,
  parseExpiryTag,
  maskPan,
  extractCardFields,
  parsePdol,
  buildPdolData,
  buildGpoCommand,
  parseAfl,
  buildReadRecordCommand,
} from '../scanner';
import type { EmvObject } from '../types';

describe('getCardSchemeFromAid', () => {
  it('should detect Visa', () => {
    expect(getCardSchemeFromAid('A0000000031010')).toBe('VISA');
    expect(getCardSchemeFromAid('A0000000032010')).toBe('VISA');
  });

  it('should detect Mastercard', () => {
    expect(getCardSchemeFromAid('A0000000041010')).toBe('MASTERCARD');
    expect(getCardSchemeFromAid('A0000000049999')).toBe('MASTERCARD');
  });

  it('should detect JCB', () => {
    expect(getCardSchemeFromAid('A0000000651010')).toBe('JCB');
  });

  it('should detect Amex', () => {
    expect(getCardSchemeFromAid('A0000000250000')).toBe('AMEX');
  });

  it('should detect UnionPay', () => {
    expect(getCardSchemeFromAid('A0000003330101')).toBe('UNIONPAY');
  });

  it('should detect Discover', () => {
    expect(getCardSchemeFromAid('A0000001523010')).toBe('DISCOVER');
    expect(getCardSchemeFromAid('A0000003241010')).toBe('DISCOVER');
    expect(getCardSchemeFromAid('A0000004440101')).toBe('DISCOVER');
  });

  it('should return null for unknown AID', () => {
    expect(getCardSchemeFromAid('B000000000')).toBeNull();
    expect(getCardSchemeFromAid('')).toBeNull();
  });

  it('should handle lowercase AID input', () => {
    expect(getCardSchemeFromAid('a0000000031010')).toBe('VISA');
    expect(getCardSchemeFromAid('a0000000041010')).toBe('MASTERCARD');
    expect(getCardSchemeFromAid('a0000001523010')).toBe('DISCOVER');
  });
});

describe('extractAidTags', () => {
  it('extracts a Visa AID from a PPSE-like payload', () => {
    const hex = '6F1A840E325041592E5359532E4444463031A50A4F07A0000000031010';
    expect(extractAidTags(hex)).toEqual(['A0000000031010']);
  });

  it('extracts multiple AIDs without trailing garbage', () => {
    const hex = '4F07A00000000310104F07A0000000041010';
    expect(extractAidTags(hex)).toEqual(['A0000000031010', 'A0000000041010']);
  });
});

describe('track2 and expiry parsers', () => {
  it('parses Track 2 with F padding', () => {
    expect(parseTrack2Equivalent('4111111111111111D27122011234567890F')).toEqual({
      card: '4111111111111111',
      exp: '12/27',
    });
  });

  it('returns empty object when D is missing', () => {
    expect(parseTrack2Equivalent('4111111111111111F')).toEqual({});
  });

  it('parses 5F24 YYMMDD with padding', () => {
    expect(parseExpiryTag('271231')).toBe('12/27');
    expect(parseExpiryTag('2712F')).toBe('12/27');
  });
});

describe('extractCardFields', () => {
  it('reads PAN and expiry from 5A and 5F24', () => {
    const objects: EmvObject[] = [
      {
        tag: '70',
        length: '0F',
        value: [
          { tag: '5A', length: '08', value: '4111111111111111' },
          { tag: '5F24', length: '03', value: '271231' },
        ],
      },
    ];
    expect(extractCardFields(objects)).toEqual({
      card: '4111111111111111',
      exp: '12/27',
    });
  });

  it('falls back to Track 2 tag 57 in a nested template', () => {
    const objects: EmvObject[] = [
      {
        tag: '77',
        length: '13',
        value: [
          { tag: '57', length: '13', value: '5555555555554444D2802201F' },
        ],
      },
    ];
    expect(extractCardFields(objects)).toEqual({
      card: '5555555555554444',
      exp: '02/28',
    });
  });
});

describe('PDOL / GPO / AFL', () => {
  it('parses mixed 1-byte and 2-byte PDOL tags', () => {
    expect(parsePdol('9F66049F02065F2A029A039C01')).toEqual([
      { tag: '9F66', length: 4 },
      { tag: '9F02', length: 6 },
      { tag: '5F2A', length: 2 },
      { tag: '9A', length: 3 },
      { tag: '9C', length: 1 },
    ]);
  });

  it('builds PDOL data to the requested lengths', () => {
    const data = buildPdolData('9F66049F0206');
    expect(data).toHaveLength(20);
    expect(data.startsWith('26000000')).toBe(true);
  });

  it('builds an empty-PDOL GPO command', () => {
    expect(buildGpoCommand('')).toBe('80A8000002830000');
  });

  it('builds a GPO command wrapping PDOL data in tag 83', () => {
    expect(buildGpoCommand('26000000')).toBe('80A800000683042600000000');
  });

  it('parses AFL entries', () => {
    expect(parseAfl('0801010010010300')).toEqual([
      { sfi: 1, first: 1, last: 1 },
      { sfi: 2, first: 1, last: 3 },
    ]);
  });

  it('builds READ RECORD for SFI 2 record 1', () => {
    expect(buildReadRecordCommand(2, 1)).toBe('00B2011400');
  });
});

describe('maskPan', () => {
  it('masks the middle digits', () => {
    expect(maskPan('4111111111111111')).toBe('4111********1111');
  });
});
