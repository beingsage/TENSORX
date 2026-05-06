function buildCorsHeaders(contentType?: string | null, contentLength?: string | null) {
  const headers = new Headers();

  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  return headers;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get('url')?.trim();

  if (!sourceUrl) {
    return Response.json(
      {
        success: false,
        error: {
          code: 'MISSING_URL',
          message: 'Query parameter "url" is required.',
        },
      },
      { status: 400 }
    );
  }

  let target: URL;
  try {
    target = new URL(sourceUrl);
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Invalid proxy URL.',
        },
      },
      { status: 400 }
    );
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return Response.json(
      {
        success: false,
        error: {
          code: 'UNSUPPORTED_PROTOCOL',
          message: 'Only http and https URLs are supported.',
        },
      },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        Accept: 'model/gltf-binary,model/gltf+json,application/octet-stream,*/*',
      },
    });

    if (!upstream.ok) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'UPSTREAM_FAILED',
            message: `Proxy fetch failed with status ${upstream.status}.`,
          },
        },
        { status: upstream.status }
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: buildCorsHeaders(
        upstream.headers.get('content-type') || 'application/octet-stream',
        upstream.headers.get('content-length')
      ),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: {
          code: 'PROXY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch remote GLB.',
        },
      },
      { status: 502 }
    );
  }
}
