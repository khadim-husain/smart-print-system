import { PaperSize, ColorMode } from '../types/order.types';
import { UNIT_PRICE_INR } from '../constants/pricing.constants';
import { BadRequestError } from '../errors/bad-request.error';

export interface PricingBreakdown {
  paperSize: PaperSize;
  colorMode: ColorMode;
  copies: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
}

export class PricingService {
  /**
   * Retrieves the unit price per copy for given paper size and color mode.
   */
  public static getUnitPrice(paperSize: PaperSize, colorMode: ColorMode): number {
    const sizeMatrix = UNIT_PRICE_INR[paperSize];
    if (!sizeMatrix) {
      throw new BadRequestError(`Unsupported paper size: ${paperSize}`);
    }

    const rate = sizeMatrix[colorMode];
    if (rate === undefined) {
      throw new BadRequestError(`Unsupported color mode: ${colorMode}`);
    }

    return rate;
  }

  /**
   * Calculates the total price in INR for the requested print job.
   * Total = copies * unitPrice(paperSize, colorMode)
   */
  public static calculatePrice(paperSize: PaperSize, colorMode: ColorMode, copies: number): number {
    if (!Number.isInteger(copies) || copies <= 0) {
      throw new BadRequestError('Copies count must be a positive integer greater than zero');
    }

    const unitPrice = this.getUnitPrice(paperSize, colorMode);
    const total = copies * unitPrice;

    // Return with 2 decimal precision
    return Number(total.toFixed(2));
  }

  /**
   * Generates a detailed itemized breakdown of the pricing calculation.
   */
  public static getPricingBreakdown(
    paperSize: PaperSize,
    colorMode: ColorMode,
    copies: number,
  ): PricingBreakdown {
    const unitPrice = this.getUnitPrice(paperSize, colorMode);
    const totalPrice = this.calculatePrice(paperSize, colorMode, copies);

    return {
      paperSize,
      colorMode,
      copies,
      unitPrice,
      totalPrice,
      currency: 'INR',
    };
  }
}
