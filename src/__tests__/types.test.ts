import { describe, it, expect } from 'vitest';
import { NfcError } from '../types';

describe('NfcError', () => {
  it('should have all expected error codes', () => {
    expect(NfcError.NFC_NOT_SUPPORTED).toBe('NFC_NOT_SUPPORTED');
    expect(NfcError.NFC_NOT_ENABLED).toBe('NFC_NOT_ENABLED');
    expect(NfcError.AID_NOT_FOUND).toBe('AID_NOT_FOUND');
    expect(NfcError.UNSUPPORTED_CARD_SCHEME).toBe('UNSUPPORTED_CARD_SCHEME');
    expect(NfcError.CARD_READ_FAILED).toBe('CARD_READ_FAILED');
    expect(NfcError.SCAN_TIMEOUT).toBe('SCAN_TIMEOUT');
  });

  it('should be usable in Error constructor', () => {
    const error = new Error(NfcError.NFC_NOT_SUPPORTED);
    expect(error.message).toBe('NFC_NOT_SUPPORTED');
    expect(error).toBeInstanceOf(Error);
  });
});
