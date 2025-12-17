/**
 * Invoice calculation logic
 * Implements requirements 5.1, 5.2, 5.3
 */

import Decimal from 'decimal.js';

export interface LineItemInput {
  description: string;
  quantity: Decimal | string | number;
  unitPrice: Decimal | string | number;
}

export interface CalculatedLineItem {
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  total: Decimal;
}

export interface InvoiceCalculation {
  lineItems: CalculatedLineItem[];
  subtotal: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  total: Decimal;
}

/**
 * Calculate line item total
 * _需求: 5.2_ - 明细项 total = quantity × unitPrice
 */
export function calculateLineItemTotal(quantity: Decimal, unitPrice: Decimal): Decimal {
  return quantity.mul(unitPrice);
}

/**
 * Calculate a single line item with total
 */
export function calculateLineItem(input: LineItemInput): CalculatedLineItem {
  const quantity = new Decimal(input.quantity);
  const unitPrice = new Decimal(input.unitPrice);
  const total = calculateLineItemTotal(quantity, unitPrice);

  return {
    description: input.description,
    quantity,
    unitPrice,
    total,
  };
}

/**
 * Calculate invoice subtotal from line items
 * _需求: 5.1_ - subtotal = sum(lineItems.total)
 */
export function calculateSubtotal(lineItems: CalculatedLineItem[]): Decimal {
  return lineItems.reduce((sum, item) => sum.add(item.total), new Decimal(0));
}

/**
 * Calculate tax amount
 * _需求: 5.3_ - taxAmount = subtotal × taxRate
 */
export function calculateTaxAmount(subtotal: Decimal, taxRate: Decimal): Decimal {
  return subtotal.mul(taxRate);
}

/**
 * Calculate invoice total
 * _需求: 5.1, 5.3_ - total = subtotal + taxAmount
 */
export function calculateTotal(subtotal: Decimal, taxAmount: Decimal): Decimal {
  return subtotal.add(taxAmount);
}

/**
 * Calculate complete invoice from line items and tax rate
 */
export function calculateInvoice(
  lineItemInputs: LineItemInput[],
  taxRate: Decimal | string | number = 0
): InvoiceCalculation {
  const taxRateDecimal = new Decimal(taxRate);
  const lineItems = lineItemInputs.map(calculateLineItem);
  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTaxAmount(subtotal, taxRateDecimal);
  const total = calculateTotal(subtotal, taxAmount);

  return {
    lineItems,
    subtotal,
    taxRate: taxRateDecimal,
    taxAmount,
    total,
  };
}

/**
 * Recalculate invoice totals from existing line items
 */
export function recalculateInvoiceTotals(
  lineItems: CalculatedLineItem[],
  taxRate: Decimal
): { subtotal: Decimal; taxAmount: Decimal; total: Decimal } {
  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTaxAmount(subtotal, taxRate);
  const total = calculateTotal(subtotal, taxAmount);

  return { subtotal, taxAmount, total };
}
