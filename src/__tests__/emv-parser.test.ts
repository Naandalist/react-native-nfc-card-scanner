import { describe, it, expect } from 'vitest';
import emv from '../emv';

describe('emv.parse', () => {
  it('should parse a simple TLV structure', () => {
    // Tag 5A (PAN), length 08, value 4761739001010119
    emv.parse('5A084761739001010119', (result) => {
      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe('5A');
      expect(result[0].value).toBe('4761739001010119');
    });
  });

  it('should parse multiple TLV entries', () => {
    // Tag 5A (PAN) + Tag 5F24 (Expiry)
    emv.parse('5A0847617390010101195F24032712310000', (result) => {
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].tag).toBe('5A');
      expect(result[1].tag).toBe('5F24');
      expect(result[1].value).toBe('271231');
    });
  });

  it('should parse constructed (nested) tags', () => {
    // Tag 6F (constructed), containing tag 84
    emv.parse('6F10840E325041592E5359532E4444463031', (result) => {
      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe('6F');
      expect(Array.isArray(result[0].value)).toBe(true);
      const inner = result[0].value as typeof result;
      expect(inner[0].tag).toBe('84');
    });
  });
});

describe('emv.lookup', () => {
  it('should find known tag names', () => {
    emv.lookup('42', (name) => {
      expect(name).toBe('Issuer Identification Number (IIN)');
    });
  });

  it('should return undefined for unknown tags', () => {
    emv.lookup('ZZZZ', (name) => {
      expect(name).toBeUndefined();
    });
  });
});

describe('emv.getValue', () => {
  it('should extract value for a given tag', () => {
    emv.parse('5A084761739001010119', (parsed) => {
      emv.getValue('5A', parsed, (value) => {
        expect(value).toBe('4761739001010119');
      });
    });
  });
});

describe('emv.getElement', () => {
  it('should extract the full element for a given tag', () => {
    emv.parse('5A084761739001010119', (parsed) => {
      emv.getElement('5A', parsed, (element) => {
        expect(element.tag).toBe('5A');
        expect(element.value).toBe('4761739001010119');
        expect(element.length).toBeDefined();
      });
    });
  });
});
