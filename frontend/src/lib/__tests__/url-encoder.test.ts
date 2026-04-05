/**
 * URL Encoder Property-Based Tests
 * 
 * Tests for URL state encoding/decoding functionality
 * Requirements: 37.3, 37.5, 37.6, 64.1, 64.2, 64.3, 64.4, 64.5, 64.6, 64.7
 */

import {
  encodeToURL,
  decodeFromURL,
  canEncodeToURL,
  getEncodedURLLength,
  getCompressionRatio,
} from '../url-encoder';

describe('URL Encoder', () => {
  // Property 24: URL State Encoding Round-Trip
  describe('Property 24: Round-Trip Encoding', () => {
    test('should preserve state through encode-decode cycle', () => {
      const testCases = [
        {
          totalArea: '100',
          dairyCows: '50',
          crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
        },
        {
          totalArea: '150.5',
          dairyCows: '75',
          pigs: '30',
          chickens: '200',
          crops: [
            { crop_id: 1, area: '50.25', nitrogen: '150.5', phosphorus: '75.25' },
            { crop_id: 2, area: '49.75', nitrogen: '120.5', phosphorus: '60.25' },
          ],
        },
        {
          totalArea: '0',
          dairyCows: '0',
          crops: [],
        },
      ];

      testCases.forEach((state) => {
        const encoded = encodeToURL(state);
        const decoded = decodeFromURL(encoded);
        expect(JSON.stringify(decoded)).toBe(JSON.stringify(state));
      });
    });

    test('should handle special characters in state', () => {
      const state = {
        farmName: 'Test Farm™ © ®',
        description: 'Special chars: é à ü ñ',
        data: { value: 'test\nwith\nnewlines' },
      };

      const encoded = encodeToURL(state);
      const decoded = decodeFromURL(encoded);
      expect(decoded).toEqual(state);
    });

    test('should handle numeric precision', () => {
      const state = {
        value1: 123.456789,
        value2: 0.0001,
        value3: 999999.999999,
      };

      const encoded = encodeToURL(state);
      const decoded = decodeFromURL(encoded);
      expect(decoded).toEqual(state);
    });
  });

  // Property 25: URL Compression Reduces Length
  describe('Property 25: Compression Efficiency', () => {
    test('should compress state smaller than JSON', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
        crops: Array.from({ length: 10 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
          phosphorus: '50',
          potassium: '100',
        })),
      };

      const json = JSON.stringify(state);
      const encoded = encodeToURL(state);

      expect(encoded.length).toBeLessThan(json.length);
    });

    test('should have compression ratio > 1', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
        crops: Array.from({ length: 5 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
        })),
      };

      const ratio = getCompressionRatio(state);
      expect(ratio).toBeGreaterThan(1);
    });

    test('should compress repetitive data well', () => {
      const state = {
        crops: Array.from({ length: 20 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
          phosphorus: '50',
          potassium: '100',
          manure: '20',
          diesel: '15',
          irrigation: '50',
        })),
      };

      const ratio = getCompressionRatio(state);
      expect(ratio).toBeGreaterThan(2);
    });
  });

  // Property 26: URL Encoding is URL-Safe
  describe('Property 26: URL-Safe Encoding', () => {
    test('should produce URL-safe characters only', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
        crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
      };

      const encoded = encodeToURL(state);

      // URL-safe characters: A-Z a-z 0-9 - _ . ~ (and encoded URI component safe)
      const urlSafeRegex = /^[A-Za-z0-9\-_.~%]*$/;
      expect(encoded).toMatch(urlSafeRegex);
    });

    test('should not contain special URL characters', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
        crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
      };

      const encoded = encodeToURL(state);

      // Should not contain these characters
      expect(encoded).not.toMatch(/[<>{}|\\^`"]/);
    });

    test('should be decodable from URL parameter', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
        crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
      };

      const encoded = encodeToURL(state);
      const url = new URL('https://example.com');
      url.searchParams.set('state', encoded);

      // Extract from URL and decode
      const extracted = url.searchParams.get('state');
      expect(extracted).toBe(encoded);

      const decoded = decodeFromURL(extracted!);
      expect(decoded).toEqual(state);
    });
  });

  // Property 27: URL Length Constraint
  describe('Property 27: URL Length Constraint', () => {
    test('should enforce 2000 character limit', () => {
      const largeState = {
        crops: Array.from({ length: 100 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
          phosphorus: '50',
          potassium: '100',
          manure: '20',
          diesel: '15',
          irrigation: '50',
          pesticides: Array.from({ length: 10 }, (_, j) => ({
            pesticide_id: j,
            rate: '1.5',
          })),
        })),
      };

      expect(() => encodeToURL(largeState)).toThrow();
    });

    test('should allow states under 2000 characters', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
        crops: Array.from({ length: 10 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
        })),
      };

      const encoded = encodeToURL(state);
      expect(encoded.length).toBeLessThanOrEqual(2000);
    });

    test('should report accurate URL length', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
        crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
      };

      const encoded = encodeToURL(state);
      const reportedLength = getEncodedURLLength(state);

      expect(reportedLength).toBe(encoded.length);
    });
  });

  // Property 28: URL Encoding Error for Oversized State
  describe('Property 28: Oversized State Error Handling', () => {
    test('should throw error with size information', () => {
      // Create data that doesn't compress well (random-like data)
      const randomData = Array.from({ length: 5000 }, (_, i) => 
        Math.random().toString(36).substring(2, 15)
      ).join('');
      
      const largeState = {
        data: randomData,
      };

      expect(() => encodeToURL(largeState)).toThrow(/too large/i);
    });

    test('should indicate size in error message', () => {
      const largeState = {
        crops: Array.from({ length: 100 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
          phosphorus: '50',
          potassium: '100',
          manure: '20',
          diesel: '15',
          irrigation: '50',
          pesticides: Array.from({ length: 10 }, (_, j) => ({
            pesticide_id: j,
            rate: '1.5',
          })),
        })),
      };

      try {
        encodeToURL(largeState);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/\d+/);
      }
    });

    test('canEncodeToURL should return false for oversized state', () => {
      const largeState = {
        crops: Array.from({ length: 100 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
          phosphorus: '50',
          potassium: '100',
          manure: '20',
          diesel: '15',
          irrigation: '50',
          pesticides: Array.from({ length: 10 }, (_, j) => ({
            pesticide_id: j,
            rate: '1.5',
          })),
        })),
      };

      expect(canEncodeToURL(largeState)).toBe(false);
    });
  });

  // Property 29: URL Decoder Validates Input
  describe('Property 29: Input Validation', () => {
    test('should reject invalid encoded strings', () => {
      expect(() => decodeFromURL('invalid!!!data')).toThrow();
    });

    test('should reject empty strings', () => {
      expect(() => decodeFromURL('')).toThrow();
    });

    test('should reject null-like values', () => {
      expect(() => decodeFromURL(null as any)).toThrow();
      expect(() => decodeFromURL(undefined as any)).toThrow();
    });

    test('should reject corrupted data', () => {
      const state = {
        totalArea: '100',
        dairyCows: '50',
      };

      const encoded = encodeToURL(state);
      const corrupted = encoded.slice(0, -5) + 'xxxxx';

      expect(() => decodeFromURL(corrupted)).toThrow();
    });

    test('should validate decoded object structure', () => {
      // Create a valid encoded string
      const state = { test: 'value' };
      const encoded = encodeToURL(state);

      // Decode should return an object
      const decoded = decodeFromURL(encoded);
      expect(typeof decoded).toBe('object');
      expect(decoded).not.toBeNull();
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    test('should handle empty state object', () => {
      const state = {};
      const encoded = encodeToURL(state);
      const decoded = decodeFromURL(encoded);
      expect(decoded).toEqual(state);
    });

    test('should handle deeply nested objects', () => {
      const state = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      const encoded = encodeToURL(state);
      const decoded = decodeFromURL(encoded);
      expect(decoded).toEqual(state);
    });

    test('should handle arrays of various types', () => {
      const state = {
        strings: ['a', 'b', 'c'],
        numbers: [1, 2, 3],
        mixed: [1, 'two', 3.5, true, null],
      };

      const encoded = encodeToURL(state);
      const decoded = decodeFromURL(encoded);
      expect(decoded).toEqual(state);
    });

    test('should handle boolean and null values', () => {
      const state = {
        isActive: true,
        isInactive: false,
        nullable: null,
      };

      const encoded = encodeToURL(state);
      const decoded = decodeFromURL(encoded);
      expect(decoded).toEqual(state);
    });
  });
});
