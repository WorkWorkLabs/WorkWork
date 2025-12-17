/**
 * Invoice PDF export
 * _需求: 5.6_
 * 
 * Note: Full PDF generation requires @react-pdf/renderer or puppeteer
 * This is a placeholder that can be expanded later
 */

import type { Invoice, LineItem, Client } from '@prisma/client';

export interface InvoicePDFData {
  invoice: Invoice & { lineItems: LineItem[] };
  client: Client;
  businessName?: string;
  logoUrl?: string;
}

/**
 * Generate PDF buffer for invoice
 * TODO: Implement with @react-pdf/renderer or puppeteer
 */
export async function generateInvoicePDF(_data: InvoicePDFData): Promise<Buffer> {
  // Placeholder implementation
  // In production, use @react-pdf/renderer or puppeteer to generate actual PDF
  const placeholder = `Invoice PDF for ${_data.invoice.invoiceNumber}`;
  return Buffer.from(placeholder, 'utf-8');
}

/**
 * Generate invoice HTML for PDF conversion
 */
export function generateInvoiceHTML(data: InvoicePDFData): string {
  const { invoice, client, businessName } = data;
  
  const lineItemsHtml = invoice.lineItems
    .map(
      (item) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${invoice.currency} ${item.unitPrice}</td>
        <td>${invoice.currency} ${item.total}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .invoice-info { text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; }
        .totals { text-align: right; margin-top: 20px; }
        .total-row { font-weight: bold; font-size: 1.2em; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${businessName || 'Invoice'}</h1>
        </div>
        <div class="invoice-info">
          <h2>Invoice #${invoice.invoiceNumber}</h2>
          <p>Issue Date: ${invoice.issueDate.toLocaleDateString()}</p>
          <p>Due Date: ${invoice.dueDate.toLocaleDateString()}</p>
        </div>
      </div>
      
      <div class="client-info">
        <h3>Bill To:</h3>
        <p>${client.name}</p>
        <p>${client.email}</p>
        ${client.company ? `<p>${client.company}</p>` : ''}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>
      
      <div class="totals">
        <p>Subtotal: ${invoice.currency} ${invoice.subtotal}</p>
        <p>Tax (${Number(invoice.taxRate) * 100}%): ${invoice.currency} ${invoice.taxAmount}</p>
        <p class="total-row">Total: ${invoice.currency} ${invoice.total}</p>
      </div>
      
      ${invoice.notes ? `<div class="notes"><h3>Notes:</h3><p>${invoice.notes}</p></div>` : ''}
    </body>
    </html>
  `;
}
