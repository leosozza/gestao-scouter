// Testar getValorFichaFromRow:
// - Deve ler de cada chave candidata (case-insensitive).
// - Deve ignorar valores 0/invalid e retornar 0 quando não encontrar.
// - mediaValorPorFicha ignora 0 e calcula média corretamente.

import { getValorFichaFromRow, mediaValorPorFicha } from '../values';

describe('getValorFichaFromRow', () => {
  test('should read from "Valor por Fichas" key', () => {
    const row = { 'Valor por Fichas': 'R$ 6,00' };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should read from "Valor Ficha" key', () => {
    const row = { 'Valor Ficha': '6,00' };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should read from "Valor_ficha" key', () => {
    const row = { 'Valor_ficha': '6.00' };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should read from "R$/Ficha" key', () => {
    const row = { 'R$/Ficha': 'R$6' };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should be case-insensitive', () => {
    const row = { 'valor por fichas': 'R$ 6,00' };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should ignore 0 values and try next key', () => {
    const row = { 
      'Valor por Fichas': '0',
      'Valor Ficha': 'R$ 6,00'
    };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should return 0 when no valid value found', () => {
    const row = { 'Other Field': 'something' };
    expect(getValorFichaFromRow(row)).toBe(0);
  });

  test('should handle null/undefined row', () => {
    expect(getValorFichaFromRow(null)).toBe(0);
    expect(getValorFichaFromRow(undefined)).toBe(0);
  });

  test('should use fuzzy matching for valor+ficha keywords', () => {
    const row = { 'Valor da Ficha Nova': 'R$ 6,00' };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should prefer exact matches over fuzzy matches', () => {
    const row = { 
      'Valor customizado por ficha': 'R$ 10,00',
      'Valor Ficha': 'R$ 6,00'
    };
    expect(getValorFichaFromRow(row)).toBe(6);
  });

  test('should handle spaces in key names', () => {
    const row = { ' Valor por Fichas ': 'R$ 6,00' };
    expect(getValorFichaFromRow(row)).toBe(6);
  });
});

describe('mediaValorPorFicha', () => {
  test('should calculate average correctly', () => {
    const rows = [
      { 'Valor por Fichas': 'R$ 6,00' },
      { 'Valor por Fichas': 'R$ 8,00' },
      { 'Valor por Fichas': 'R$ 10,00' }
    ];
    expect(mediaValorPorFicha(rows)).toBe(8);
  });

  test('should ignore 0 values in average calculation', () => {
    const rows = [
      { 'Valor por Fichas': 'R$ 6,00' },
      { 'Valor por Fichas': '0' },
      { 'Valor por Fichas': 'R$ 10,00' }
    ];
    expect(mediaValorPorFicha(rows)).toBe(8);
  });

  test('should return 0 for empty array', () => {
    expect(mediaValorPorFicha([])).toBe(0);
  });

  test('should return 0 when no valid values found', () => {
    const rows = [
      { 'Other Field': 'something' },
      { 'Another Field': 'else' }
    ];
    expect(mediaValorPorFicha(rows)).toBe(0);
  });

  test('should handle null/undefined array', () => {
    expect(mediaValorPorFicha(null as any)).toBe(0);
    expect(mediaValorPorFicha(undefined as any)).toBe(0);
  });

  test('should calculate average with different value keys', () => {
    const rows = [
      { 'Valor por Fichas': 'R$ 6,00' },
      { 'Valor Ficha': 'R$ 8,00' },
      { 'R$/Ficha': 'R$ 10,00' }
    ];
    expect(mediaValorPorFicha(rows)).toBe(8);
  });
});