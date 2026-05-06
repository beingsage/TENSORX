import PDFDocument from 'pdfkit';
import { NextResponse } from 'next/server';
import { generateId } from '@/lib/ids';
import { parsePagination, requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { getValuation, listValuations } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const url = new URL(request.url);
    const requestId = generateId('EXP').toLowerCase();
    const format = url.searchParams.get('format') || 'json';
    const valuationId = url.searchParams.get('valuationId');
    const { limit } = parsePagination(url.searchParams);

    const valuations = valuationId
      ? [await getValuation(valuationId, user.userId)].filter(Boolean)
      : await listValuations(limit, 0, { userId: user.userId });

    if (format === 'csv') {
      return exportAsCSV(valuations as any[], requestId);
    }
    if (format === 'json') {
      return exportAsJSON(valuations as any[], requestId);
    }
    if (format === 'pdf') {
      return await exportAsPDF(valuations as any[], requestId);
    }

    throw new RouteError(400, 'INVALID_FORMAT', 'Supported formats: csv, json and pdf.');
  } catch (error) {
    return routeErrorResponse(error);
  }
}

function exportAsCSV(valuations: any[], requestId: string) {
  const headers = [
    'Valuation ID',
    'Property ID',
    'Timestamp',
    'Estimated Value',
    'Lower Bound',
    'Upper Bound',
    'Confidence',
    'Risk Score',
    'Liquidity Index',
    'Days to Sell',
    'Risk Flags',
  ];

  const rows = valuations.map(v => [
    v.valuationId,
    v.propertyId,
    new Date(v.timestamp).toISOString(),
    v.valuation.pointEstimate,
    v.valuation.lowerBound,
    v.valuation.upperBound,
    (v.valuation.confidence * 100).toFixed(1),
    '0', // placeholder for risk score
    v.liquidity.resalePotentialIndex,
    v.liquidity.estimatedTimeToSell,
    v.riskFlags.length,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="valuations-${requestId}.csv"`,
    },
  });
}

function exportAsJSON(valuations: any[], requestId: string) {
  const json = JSON.stringify(
    {
      exportId: requestId,
      exportDate: new Date().toISOString(),
      count: valuations.length,
      valuations,
    },
    null,
    2
  );

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="valuations-${requestId}.json"`,
    },
  });
}

async function exportAsPDF(valuations: any[], requestId: string) {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const buffers: Uint8Array[] = [];

  return new Promise<NextResponse>((resolve, reject) => {
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(
        new NextResponse(pdfData, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="valuations-${requestId}.pdf"`,
          },
        })
      );
    });
    doc.on('error', reject);

    doc.fontSize(20).text('Valuation Export', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#444').text(`Export ID: ${requestId}`);
    doc.text(`Export Date: ${new Date().toISOString()}`);
    doc.moveDown(1);

    valuations.forEach((valuation, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.fontSize(14).fillColor('#000').text(`Property ${index + 1}`, {
        underline: true,
      });
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor('#111');
      doc.text(`Valuation ID: ${valuation.valuationId}`);
      doc.text(`Property ID: ${valuation.propertyId}`);
      doc.text(`Timestamp: ${new Date(valuation.timestamp).toLocaleString()}`);
      doc.text(`Estimated Value: ${formatCurrency(valuation.valuation.pointEstimate)}`);
      doc.text(
        `Value Range: ${formatCurrency(valuation.valuation.lowerBound)} - ${formatCurrency(
          valuation.valuation.upperBound
        )}`
      );
      doc.text(`Confidence: ${(valuation.valuation.confidence * 100).toFixed(1)}%`);
      doc.text(`Liquidity Index: ${valuation.liquidity?.resalePotentialIndex ?? 'N/A'}`);
      doc.text(`Days to Sell: ${valuation.liquidity?.estimatedTimeToSell ?? 'N/A'}`);
      doc.text(`Risk Score: ${valuation.riskScore ?? 'N/A'}`);
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor('#000').text('Risk Flags:', { underline: true });
      doc.fontSize(10).fillColor('#333');
      if (Array.isArray(valuation.riskFlags) && valuation.riskFlags.length > 0) {
        valuation.riskFlags.forEach((flag: string) => doc.text(`• ${flag}`));
      } else {
        doc.text('• None');
      }
    });

    doc.end();
  });
}

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString('en-IN')}`;
}
