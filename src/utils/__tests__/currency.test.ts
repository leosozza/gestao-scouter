// Adicionar testes unitários de parsing (Jest):
// - "R$ 6,00" -> 6
// - "6,00" -> 6
// - "6.00" -> 6
// - "R$6" -> 6
// - "R$ 1.234,56" (NBSP) -> 1234.56
// - "1.234,56" -> 1234.56
// - "" / null / undefined -> 0
// - "abc" -> 0

import { parseBRL, formatBRL } from '../currency';

describe('parseBRL', () => {
  test('should parse R$ 6,00 to 6', () => {
    expect(parseBRL('R$ 6,00')).toBe(6);
  });

  test('should parse 6,00 to 6', () => {
    expect(parseBRL('6,00')).toBe(6);
  });

  test('should parse 6.00 to 6', () => {
    expect(parseBRL('6.00')).toBe(6);
  });

  test('should parse R$6 to 6', () => {
    expect(parseBRL('R$6')).toBe(6);
  });

  test('should parse R$ 1.234,56 to 1234.56', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(1234.56);
  });

  test('should parse 1.234,56 to 1234.56', () => {
    expect(parseBRL('1.234,56')).toBe(1234.56);
  });

  test('should parse empty string to 0', () => {
    expect(parseBRL('')).toBe(0);
  });

  test('should parse null to 0', () => {
    expect(parseBRL(null)).toBe(0);
  });

  test('should parse undefined to 0', () => {
    expect(parseBRL(undefined)).toBe(0);
  });

  test('should parse abc to 0', () => {
    expect(parseBRL('abc')).toBe(0);
  });

  test('should handle numbers directly', () => {
    expect(parseBRL(6)).toBe(6);
    expect(parseBRL(1234.56)).toBe(1234.56);
  });

  test('should handle invalid numbers', () => {
    expect(parseBRL(NaN)).toBe(0);
    expect(parseBRL(Infinity)).toBe(0);
  });

  test('should handle NBSP and spaces', () => {
    expect(parseBRL('R$\u00A01.234,56')).toBe(1234.56);
    expect(parseBRL(' R$ 1.234,56 ')).toBe(1234.56);
  });

  test('should handle r$ (lowercase)', () => {
    expect(parseBRL('r$ 6,00')).toBe(6);
    expect(parseBRL('r$6')).toBe(6);
  });
});

describe('formatBRL', () => {
  test('should format 6 as R$ 6,00', () => {
    const result = formatBRL(6);
    expect(result).toContain('6,00');
    expect(result).toContain('R$');
  });

  test('should format 1234.56 with thousands separator', () => {
    const result = formatBRL(1234.56);
    expect(result).toContain('1.234,56');
    expect(result).toContain('R$');
  });

  test('should handle 0', () => {
    const result = formatBRL(0);
    expect(result).toContain('0,00');
    expect(result).toContain('R$');
  });

  test('should handle negative numbers', () => {
    const result = formatBRL(-6);
    expect(result).toContain('-');
    expect(result).toContain('6,00');
  });
});