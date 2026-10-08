import { generateOrderId, isValidOrderId } from '../../src/utils/order-id';

describe('Order ID Generator Unit Tests', () => {
  it('should generate an ID matching ORD-YYYYMMDD-XXXXXX format', () => {
    const id = generateOrderId();
    expect(isValidOrderId(id)).toBe(true);
    expect(id).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
  });

  it('should use current date by default in the date segment', () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const expectedPrefix = `ORD-${year}${month}${day}-`;

    const id = generateOrderId();
    expect(id.startsWith(expectedPrefix)).toBe(true);
  });

  it('should respect custom date argument', () => {
    const fixedDate = new Date('2026-10-08T12:00:00Z');
    const id = generateOrderId(fixedDate);
    expect(id.startsWith('ORD-20261008-')).toBe(true);
  });

  it('should validate correctly with isValidOrderId', () => {
    expect(isValidOrderId('ORD-20261008-000001')).toBe(true);
    expect(isValidOrderId('ORD-20261008-A1B2C3')).toBe(true);
    expect(isValidOrderId('INVALID-ID')).toBe(false);
    expect(isValidOrderId('ORD-202610-001')).toBe(false);
    expect(isValidOrderId('')).toBe(false);
  });

  it('should guarantee collision resistance across 1000 consecutive generations', () => {
    const ids = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const id = generateOrderId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }

    expect(ids.size).toBe(count);
  });
});
