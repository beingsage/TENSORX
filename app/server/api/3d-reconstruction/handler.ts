/**
 * API Endpoint for 3D Building Reconstruction using Noidea Platform
 * POST /api/3d-reconstruction
 * 
 * This endpoint handles:
 * 1. Floor plan image upload
 * 2. Initial processing and segmentation
 * 3. 3D model generation via noidea backend
 * 4. Model retrieval and caching
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    
    // Handle file upload
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File;
      const propertyId = formData.get('propertyId') as string;
      const propertyType = formData.get('propertyType') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'No image file provided' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // Forward to noidea backend or process locally
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      try {
        const noidoResponse = await fetch(`${backendUrl}/api/runs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.NOIDEA_API_KEY && {
              'Authorization': `Bearer ${process.env.NOIDEA_API_KEY}`,
            }),
          },
          body: JSON.stringify({
            image: base64,
            propertyId,
            propertyType,
            format: 'base64',
            imageName: file.name,
          }),
        });

        const noidoData = await noidoResponse.json();

        if (!noidoResponse.ok) {
          return NextResponse.json(
            { error: noidoData.detail || 'Failed to process image' },
            { status: noidoResponse.status }
          );
        }

        return NextResponse.json({
          ok: true,
          runId: noidoData.run_id,
          message: 'Image uploaded successfully. Ready for segmentation.',
          projectName: noidoData.name,
        });
      } catch (backendError) {
        console.error('[3D Reconstruction] Backend error:', backendError);
        
        // Fallback: return a mock response for development
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json({
            ok: true,
            runId: `mock-${propertyId}-${Date.now()}`,
            message: 'Image processed (mock). Backend unavailable.',
            isDevelopmentMock: true,
          });
        }

        return NextResponse.json(
          { error: 'Backend service unavailable' },
          { status: 503 }
        );
      }
    }

    // Handle segmentation request
    if (request.headers.get('x-action') === 'segment') {
      const { jobId, x, y } = await request.json();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const segmentResponse = await fetch(`${backendUrl}/api/sam3d/segment-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NOIDEA_API_KEY && {
            'Authorization': `Bearer ${process.env.NOIDEA_API_KEY}`,
          }),
        },
        body: JSON.stringify({
          job_id: jobId,
          x,
          y,
          intent: 'user_click',
        }),
      });

      const segmentData = await segmentResponse.json();

      if (!segmentResponse.ok) {
        return NextResponse.json(
          { error: segmentData.detail || 'Segmentation failed' },
          { status: segmentResponse.status }
        );
      }

      return NextResponse.json(segmentData);
    }

    // Handle 3D reconstruction request
    if (request.headers.get('x-action') === 'reconstruct') {
      const { jobId, polygon } = await request.json();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const reconstructResponse = await fetch(`${backendUrl}/api/sam3d/reconstruct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NOIDEA_API_KEY && {
            'Authorization': `Bearer ${process.env.NOIDEA_API_KEY}`,
          }),
        },
        body: JSON.stringify({
          job_id: jobId,
          polygon,
        }),
      });

      const reconstructData = await reconstructResponse.json();

      if (!reconstructResponse.ok) {
        return NextResponse.json(
          { error: reconstructData.detail || '3D generation failed' },
          { status: reconstructResponse.status }
        );
      }

      return NextResponse.json(reconstructData);
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[3D Reconstruction API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('runId');
    const action = searchParams.get('action');

    if (!runId) {
      return NextResponse.json(
        { error: 'runId is required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    if (action === 'svg') {
      // Get SVG floor plan
      const svgResponse = await fetch(`${backendUrl}/api/runs/${runId}/svg`, {
        headers: {
          ...(process.env.NOIDEA_API_KEY && {
            'Authorization': `Bearer ${process.env.NOIDEA_API_KEY}`,
          }),
        },
      });

      if (!svgResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to retrieve SVG' },
          { status: svgResponse.status }
        );
      }

      const svgText = await svgResponse.text();
      return new NextResponse(svgText, {
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    }

    if (action === 'status') {
      // Get job status
      const statusResponse = await fetch(`${backendUrl}/api/sam3d/jobs/${runId}/status`, {
        headers: {
          ...(process.env.NOIDEA_API_KEY && {
            'Authorization': `Bearer ${process.env.NOIDEA_API_KEY}`,
          }),
        },
      });

      const statusData = await statusResponse.json();
      return NextResponse.json(statusData);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[3D Reconstruction GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
