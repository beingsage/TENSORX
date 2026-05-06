import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import type { IntakeDocumentInsight, ValuationRequest } from '@/lib/db/schema';

const execFileAsync = promisify(execFile);
const SQM_TO_SQFT = 10.7639;

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function truncate(value: string, max = 3000) {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function firstMatch(text: string, expressions: RegExp[]) {
  for (const expression of expressions) {
    const match = text.match(expression);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function parseArea(text: string, label: string) {
  const expression = new RegExp(
    `${label}\\s*[:=-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(sq\\.?\\s*ft|sqft|square\\s*feet|sq\\.?\\s*m|sqm|m2|square\\s*meter(?:s)?)?`,
    'i'
  );
  const match = text.match(expression);
  if (!match?.[1]) {
    return undefined;
  }

  const value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const unit = (match[2] || '').toLowerCase();
  if (unit.includes('sq m') || unit.includes('sqm') || unit.includes('m2') || unit.includes('meter')) {
    return Math.round(value * SQM_TO_SQFT);
  }

  return Math.round(value);
}

function detectPropertyType(text: string) {
  const bhk = text.match(/\b(\d)\s*bhk\b/i);
  if (bhk) {
    return `${bhk[1]}BHK`;
  }
  if (/\bstudio\b/i.test(text)) {
    return 'Studio';
  }
  if (/\bvilla\b/i.test(text)) {
    return 'Villa';
  }
  if (/\bapartment\b/i.test(text)) {
    return 'Apartment';
  }
  return undefined;
}

function detectCondition(text: string): ValuationRequest['condition'] | undefined {
  if (/\bnewly renovated\b|\bexcellent condition\b|\bbrand new\b/i.test(text)) {
    return 'new';
  }
  if (/\bminor repairs\b|\bneeds renovation\b|\brepair work\b/i.test(text)) {
    return 'needs-renovation';
  }
  if (/\bdilapidated\b|\bunsafe\b|\bsevere damage\b/i.test(text)) {
    return 'dilapidated';
  }
  if (/\bgood condition\b|\bwell maintained\b/i.test(text)) {
    return 'good';
  }
  return undefined;
}

function detectLegalStatus(text: string): ValuationRequest['legalStatus'] | undefined {
  if (/\bdispute\b|\blitigation\b|\bstay order\b|\bencroachment\b/i.test(text)) {
    return 'disputed';
  }
  if (/\bpending\b|\bawaiting\b|\bverification\b/i.test(text)) {
    return 'pending-clearance';
  }
  if (/\bclear title\b|\bfree from encumbrance\b|\bencumbrance nil\b/i.test(text)) {
    return 'clear';
  }
  return undefined;
}

function detectMortgageStatus(text: string): ValuationRequest['mortgageStatus'] | undefined {
  if (/\bmortgage\b|\bhypothecation\b|\bcharge created\b/i.test(text)) {
    return 'mortgaged';
  }
  if (/\bmultiple charge\b|\bpari passu\b|\bconsortium lending\b/i.test(text)) {
    return 'multiple-mortgages';
  }
  if (/\bno encumbrance\b|\bno mortgage\b/i.test(text)) {
    return 'clear';
  }
  return undefined;
}

function detectCategory(fileName: string, text: string): IntakeDocumentInsight['category'] {
  const combined = `${fileName} ${text}`.toLowerCase();
  if (combined.includes('sale deed')) return 'sale-deed';
  if (combined.includes('title') || combined.includes('khata') || combined.includes('patta')) {
    return 'title-document';
  }
  if (combined.includes('tax') || combined.includes('municipal')) return 'tax-document';
  if (combined.includes('layout') || combined.includes('floor plan')) return 'layout-plan';
  return 'legal-document';
}

function buildAddressSuggestion(text: string) {
  const labeled = firstMatch(text, [
    /(?:property address|site address|schedule of property|address)\s*[:\-]?\s*([^\n]+)/i,
  ]);
  if (labeled) {
    return labeled;
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => /\b(flat|plot|sector|road|street|lane|tower|block|village|phase)\b/i.test(line));
}

function extractSuggestedPatch(text: string): Partial<ValuationRequest> {
  const ownerPhone = firstMatch(text, [
    /(?:mobile|phone|contact)\s*[:\-]?\s*(\+?\d[\d\s-]{8,}\d)/i,
  ])?.replace(/\s+/g, ' ');
  const propertyType = detectPropertyType(text);
  const bedroomCount = propertyType?.match(/^(\d)/)?.[1];

  return {
    address: buildAddressSuggestion(text),
    pincode: firstMatch(text, [/\b(\d{6})\b/]),
    ownerEmail: firstMatch(text, [/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i]),
    ownerPhone,
    propertyType,
    bedroomCount: bedroomCount ? Number(bedroomCount) : undefined,
    builtupArea: parseArea(text, 'built\\s*up\\s*area|super\\s*built\\s*up\\s*area|carpet\\s*area'),
    plotArea: parseArea(text, 'plot\\s*area|site\\s*area|land\\s*area'),
    landArea: parseArea(text, 'land\\s*area|plot\\s*area|site\\s*area'),
    floorNumber: firstMatch(text, [/(?:floor|storey)\s*[:\-]?\s*(\d{1,2})/i])
      ? Number(firstMatch(text, [/(?:floor|storey)\s*[:\-]?\s*(\d{1,2})/i]))
      : undefined,
    yearBuilt: firstMatch(text, [/(?:year of construction|constructed in|built in)\s*[:\-]?\s*(19\d{2}|20\d{2})/i])
      ? Number(firstMatch(text, [/(?:year of construction|constructed in|built in)\s*[:\-]?\s*(19\d{2}|20\d{2})/i]))
      : undefined,
    renovationYear: firstMatch(text, [/(?:renovated in|renovation year)\s*[:\-]?\s*(19\d{2}|20\d{2})/i])
      ? Number(firstMatch(text, [/(?:renovated in|renovation year)\s*[:\-]?\s*(19\d{2}|20\d{2})/i]))
      : undefined,
    city: firstMatch(text, [/(?:city|town)\s*[:\-]?\s*([^\n,]+)/i]),
    state: firstMatch(text, [/(?:state)\s*[:\-]?\s*([^\n,]+)/i]),
    legalStatus: detectLegalStatus(text),
    mortgageStatus: detectMortgageStatus(text),
    condition: detectCondition(text),
  };
}

function compactSuggestedPatch(patch: Partial<ValuationRequest>) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Partial<ValuationRequest>;
}

async function extractPdfText(file: File) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'valuation-doc-'));
  const inputPath = path.join(/* turbopackIgnore: true */ tempDir, file.name || 'document.pdf');
  const outputPath = path.join(/* turbopackIgnore: true */ tempDir, 'document.txt');

  try {
    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await execFileAsync('pdftotext', ['-layout', '-nopgbrk', inputPath, outputPath]);
    return normalizeWhitespace(await fs.readFile(outputPath, 'utf8'));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function extractRawText(file: File) {
  const contentType = file.type.toLowerCase();
  const extension = path.extname(file.name).toLowerCase();

  if (contentType.includes('pdf') || extension === '.pdf') {
    return extractPdfText(file);
  }

  if (
    contentType.startsWith('text/') ||
    ['.txt', '.json', '.csv', '.xml', '.html', '.md'].includes(extension)
  ) {
    return normalizeWhitespace(await file.text());
  }

  return null;
}

export async function extractDocumentInsight(args: {
  file: File;
  assetId?: string;
}) {
  const { file, assetId } = args;
  const warnings: string[] = [];
  let extractedText: string | null = null;

  try {
    extractedText = await extractRawText(file);
  } catch (error) {
    warnings.push(
      error instanceof Error ? error.message : 'Document text extraction failed.'
    );
  }

  if (!extractedText) {
    warnings.push(
      'No selectable text was extracted. OCR is not configured for image-only documents.'
    );
  }

  const text = extractedText || '';
  const suggestedPatch = compactSuggestedPatch(extractSuggestedPatch(text));
  const category = detectCategory(file.name, text);

  const fields: Record<string, string | number | boolean | null> = {
    address: suggestedPatch.address ?? null,
    pincode: suggestedPatch.pincode ?? null,
    ownerEmail: suggestedPatch.ownerEmail ?? null,
    ownerPhone: suggestedPatch.ownerPhone ?? null,
    propertyType: suggestedPatch.propertyType ?? null,
    builtupArea: suggestedPatch.builtupArea ?? null,
    plotArea: suggestedPatch.plotArea ?? null,
    landArea: suggestedPatch.landArea ?? null,
    yearBuilt: suggestedPatch.yearBuilt ?? null,
    renovationYear: suggestedPatch.renovationYear ?? null,
    legalStatus: suggestedPatch.legalStatus ?? null,
    mortgageStatus: suggestedPatch.mortgageStatus ?? null,
  };

  const summaryParts = [
    fields.address ? `Address: ${fields.address}` : null,
    fields.propertyType ? `Type: ${fields.propertyType}` : null,
    fields.builtupArea ? `Built-up area: ${fields.builtupArea} sqft` : null,
    fields.plotArea ? `Plot area: ${fields.plotArea} sqft` : null,
    fields.legalStatus ? `Legal status: ${fields.legalStatus}` : null,
  ].filter(Boolean);

  const insight: IntakeDocumentInsight = {
    assetId,
    sourceName: file.name,
    category,
    extractedText: text ? truncate(text, 4000) : undefined,
    summary:
      summaryParts.length > 0
        ? summaryParts.join(' | ')
        : 'No structured fields could be extracted automatically.',
    fields,
    warnings,
  };

  return {
    insight,
    suggestedPatch,
  };
}
