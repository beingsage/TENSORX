import { promises as fs } from 'fs';
import type { LocalRunRecord } from '@/lib/runs/localRuns';

export function serializeRunSummary(record: LocalRunRecord) {
  return {
    ok: true,
    job_id: record.runId,
    run_id: record.runId,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    image_path: record.imageFilename,
    image_mime_type: record.imageMimeType,
    image_width: record.imageWidth,
    image_height: record.imageHeight,
    current_task: record.currentTask,
    name: record.name,
  };
}

export function serializeRunDetail(record: LocalRunRecord) {
  return {
    ...serializeRunSummary(record),
    message: record.message,
    error: record.error,
    outputs: record.outputs,
    run_meta: record.meta,
    svg_filename: record.svgFilename,
    raw_svg_filename: record.rawSvgFilename,
  };
}

export async function createBinaryFileResponse(args: {
  absolutePath: string;
  filename: string;
  mimeType: string;
  inline?: boolean;
}) {
  const fileBuffer = await fs.readFile(args.absolutePath);
  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': args.mimeType,
      'Content-Length': String(fileBuffer.byteLength),
      'Content-Disposition': `${args.inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(
        args.filename
      )}"`,
      'Cache-Control': 'no-store',
    },
  });
}
