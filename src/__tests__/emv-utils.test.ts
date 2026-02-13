import { describe, it, expect } from 'vitest';
import {
  checkBin,
  checkDec,
  checkHex,
  Dec2Bin,
  Dec2Hex,
  Bin2Dec,
  Bin2Hex,
  Hex2Bin,
  Hex2Dec,
  Hex2Ascii,
  pad,
  unpad,
} from '../emv/utils';

describe('checkBin', () => {
  it('should validate binary strings', () => {
    expect(checkBin('0101')).toBe(true);
    expect(checkBin('1111')).toBe(true);
    expect(checkBin('2')).toBe(false);
    expect(checkBin('abc')).toBe(false);
    expect(checkBin('')).toBe(false);
  });
});

describe('checkDec', () => {
  it('should validate decimal strings', () => {
    expect(checkDec('123')).toBe(true);
    expect(checkDec('0')).toBe(true);
    expect(checkDec('abc')).toBe(false);
    expect(checkDec('')).toBe(false);
  });
});

describe('checkHex', () => {
  it('should validate hex strings', () => {
    expect(checkHex('FF')).toBe(true);
    expect(checkHex('0a')).toBe(true);
    expect(checkHex('123abc')).toBe(true);
    expect(checkHex('GG')).toBe(false);
    expect(checkHex('')).toBe(false);
  });
});

describe('Dec2Bin', () => {
  it('should convert decimal to binary', () => {
    expect(Dec2Bin('10')).toBe('1010');
    expect(Dec2Bin('255')).toBe('11111111');
    expect(Dec2Bin('0')).toBe('0');
  });

  it('should return 0 for invalid input', () => {
    expect(Dec2Bin('xyz')).toBe(0);
  });
});

describe('Dec2Hex', () => {
  it('should convert decimal to hex', () => {
    expect(Dec2Hex('255')).toBe('ff');
    expect(Dec2Hex('16')).toBe('10');
  });
});

describe('Bin2Dec', () => {
  it('should convert binary to decimal', () => {
    expect(Bin2Dec('1010')).toBe('10');
    expect(Bin2Dec('11111111')).toBe('255');
  });

  it('should return 0 for invalid input', () => {
    expect(Bin2Dec('abc')).toBe(0);
  });
});

describe('Bin2Hex', () => {
  it('should convert binary to hex', () => {
    expect(Bin2Hex('11111111')).toBe('ff');
    expect(Bin2Hex('10000')).toBe('10');
  });
});

describe('Hex2Bin', () => {
  it('should convert hex to binary', () => {
    expect(Hex2Bin('FF')).toBe('11111111');
    expect(Hex2Bin('10')).toBe('10000');
  });

  it('should return 0 for invalid input', () => {
    expect(Hex2Bin('ZZ')).toBe(0);
  });
});

describe('Hex2Dec', () => {
  it('should convert hex to decimal', () => {
    expect(Hex2Dec('FF')).toBe('255');
    expect(Hex2Dec('10')).toBe('16');
  });
});

describe('Hex2Ascii', () => {
  it('should convert hex to ASCII', () => {
    expect(Hex2Ascii('48656C6C6F')).toBe('Hello');
    expect(Hex2Ascii('4E4643')).toBe('NFC');
  });
});

describe('pad', () => {
  it('should pad with leading zeros', () => {
    expect(pad('1', 4)).toBe('0001');
    expect(pad('101', 8)).toBe('00000101');
    expect(pad('1234', 4)).toBe('1234');
  });
});

describe('unpad', () => {
  it('should remove leading zeros', () => {
    expect(unpad('0001')).toBe('1');
    expect(unpad('00000101')).toBe('101');
  });
});
