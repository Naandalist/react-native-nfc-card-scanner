import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native-nfc-manager', () => ({
  default: {},
  NfcTech: {},
  NfcAdapter: {},
}));

import { getCardSchemeFromAid } from '../scanner';

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
  });
});
