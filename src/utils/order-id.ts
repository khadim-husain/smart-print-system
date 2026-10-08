import crypto from 'crypto';

/**
 * Generates a human-readable, collision-resistant unique Order ID.
 * Format: ORD-YYYYMMDD-XXXXXX (e.g., ORD-20261008-F4A90C)
 *
 * Characteristics:
 * - Date partitioned for operational clarity and human readability on kiosk touchscreens.
 * - Suffix is generated from cryptographically secure random bytes (16.7M+ combinations per date),
 *   preventing sequential enumeration and collision hazards in concurrent edge kiosk submissions.
 * - Backed by PostgreSQL UNIQUE database constraint.
 */
export function generateOrderId(customDate?: Date): string {
  const targetDate = customDate || new Date();
  const year = targetDate.getUTCFullYear();
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getUTCDate()).padStart(2, '0');
  const dateSegment = `${year}${month}${day}`;

  // 3 bytes = 6 hex characters = 16,777,216 distinct random permutations per date bucket
  const entropySegment = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `ORD-${dateSegment}-${entropySegment}`;
}

/**
 * Validates that an orderId matches the standard human-readable format.
 */
export function isValidOrderId(orderId: string): boolean {
  const pattern = /^ORD-\d{8}-[A-Z0-9]{6}$/;
  return pattern.test(orderId);
}
