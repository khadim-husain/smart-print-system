import { PricingService } from '../../src/services/pricing.service';
import { BadRequestError } from '../../src/errors/bad-request.error';

describe('PricingService Unit Tests', () => {
  describe('Unit Rate Verification', () => {
    it('should return ₹2 per copy for A4 Black & White', () => {
      const unitPrice = PricingService.getUnitPrice('A4', 'BW');
      expect(unitPrice).toBe(2.0);
    });

    it('should return ₹10 per copy for A4 Color', () => {
      const unitPrice = PricingService.getUnitPrice('A4', 'COLOR');
      expect(unitPrice).toBe(10.0);
    });

    it('should return ₹5 per copy for A3 Black & White', () => {
      const unitPrice = PricingService.getUnitPrice('A3', 'BW');
      expect(unitPrice).toBe(5.0);
    });

    it('should return ₹20 per copy for A3 Color', () => {
      const unitPrice = PricingService.getUnitPrice('A3', 'COLOR');
      expect(unitPrice).toBe(20.0);
    });
  });

  describe('Total Price Calculation', () => {
    it('should correctly calculate 3 copies of A4 BW (3 * 2 = ₹6)', () => {
      const price = PricingService.calculatePrice('A4', 'BW', 3);
      expect(price).toBe(6.0);
    });

    it('should correctly calculate 5 copies of A4 COLOR (5 * 10 = ₹50)', () => {
      const price = PricingService.calculatePrice('A4', 'COLOR', 5);
      expect(price).toBe(50.0);
    });

    it('should correctly calculate 4 copies of A3 BW (4 * 5 = ₹20)', () => {
      const price = PricingService.calculatePrice('A3', 'BW', 4);
      expect(price).toBe(20.0);
    });

    it('should correctly calculate 2 copies of A3 COLOR (2 * 20 = ₹40)', () => {
      const price = PricingService.calculatePrice('A3', 'COLOR', 2);
      expect(price).toBe(40.0);
    });

    it('should handle single copy calculation accurately', () => {
      expect(PricingService.calculatePrice('A4', 'BW', 1)).toBe(2.0);
      expect(PricingService.calculatePrice('A4', 'COLOR', 1)).toBe(10.0);
      expect(PricingService.calculatePrice('A3', 'BW', 1)).toBe(5.0);
      expect(PricingService.calculatePrice('A3', 'COLOR', 1)).toBe(20.0);
    });
  });

  describe('Itemized Breakdown Verification', () => {
    it('should return comprehensive breakdown structure', () => {
      const breakdown = PricingService.getPricingBreakdown('A4', 'COLOR', 4);
      expect(breakdown).toEqual({
        paperSize: 'A4',
        colorMode: 'COLOR',
        copies: 4,
        unitPrice: 10.0,
        totalPrice: 40.0,
        currency: 'INR',
      });
    });
  });

  describe('Invalid Input Handling', () => {
    it('should throw BadRequestError for zero copies', () => {
      expect(() => {
        PricingService.calculatePrice('A4', 'BW', 0);
      }).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for negative copies', () => {
      expect(() => {
        PricingService.calculatePrice('A4', 'BW', -5);
      }).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for non-integer copies', () => {
      expect(() => {
        PricingService.calculatePrice('A4', 'BW', 2.5);
      }).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid paper size', () => {
      expect(() => {
        // @ts-expect-error Testing runtime invalid input
        PricingService.getUnitPrice('B5', 'BW');
      }).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid color mode', () => {
      expect(() => {
        // @ts-expect-error Testing runtime invalid input
        PricingService.getUnitPrice('A4', 'GRAYSCALE');
      }).toThrow(BadRequestError);
    });
  });
});
