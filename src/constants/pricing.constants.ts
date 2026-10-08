import { PaperSize, ColorMode } from '../types/order.types';

export const UNIT_PRICE_INR: Record<PaperSize, Record<ColorMode, number>> = {
  A4: {
    BW: 2.0,
    COLOR: 10.0,
  },
  A3: {
    BW: 5.0,
    COLOR: 20.0,
  },
} as const;

export const SUPPORTED_PAPER_SIZES: readonly PaperSize[] = ['A4', 'A3'] as const;
export const SUPPORTED_COLOR_MODES: readonly ColorMode[] = ['BW', 'COLOR'] as const;
