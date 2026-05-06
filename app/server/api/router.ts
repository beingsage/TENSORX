type ApiHandler = (
  request: Request,
  context?: { params: Promise<Record<string, string>> }
) => Response | Promise<Response>;

type ApiRouteModule = Record<string, unknown>;

type ApiRouteDefinition = {
  pattern: readonly string[];
  load: () => Promise<ApiRouteModule>;
};

const BACKEND_PROXY_PREFIXES = new Set([
  'admin',
  'billing',
  'checkout',
  'debug',
  'runs',
  'sam3d',
  'system',
  'user',
  'webhooks',
  'worker',
]);

const apiRoutes: ApiRouteDefinition[] = [
  { pattern: ['3d-reconstruction'], load: () => import('@/api/3d-reconstruction/handler') },
  { pattern: ['assets'], load: () => import('@/api/assets/handler') },
  { pattern: ['assets', ':id'], load: () => import('@/api/assets/[id]/handler') },
  { pattern: ['audit-logs'], load: () => import('@/api/audit-logs/handler') },
  { pattern: ['auth', 'login'], load: () => import('@/api/auth/login/handler') },
  { pattern: ['auth', 'logout'], load: () => import('@/api/auth/logout/handler') },
  { pattern: ['auth', 'me'], load: () => import('@/api/auth/me/handler') },
  { pattern: ['auth', 'register'], load: () => import('@/api/auth/register/handler') },
  { pattern: ['climate', 'risk'], load: () => import('@/api/climate/risk/handler') },
  { pattern: ['data', 'demographics'], load: () => import('@/api/data/demographics/handler') },
  { pattern: ['data', 'listings'], load: () => import('@/api/data/listings/handler') },
  { pattern: ['data', 'maps'], load: () => import('@/api/data/maps/handler') },
  { pattern: ['data', 'satellite'], load: () => import('@/api/data/satellite/handler') },
  { pattern: ['data', 'sentiment'], load: () => import('@/api/data/sentiment/handler') },
  { pattern: ['data', 'weather'], load: () => import('@/api/data/weather/handler') },
  { pattern: ['distress', 'stress-test'], load: () => import('@/api/distress/stress-test/handler') },
  { pattern: ['export'], load: () => import('@/api/export/handler') },
  { pattern: ['external-data'], load: () => import('@/api/external-data/handler') },
  { pattern: ['flip', 'potential'], load: () => import('@/api/flip/potential/handler') },
  { pattern: ['health'], load: () => import('@/api/health/handler') },
  { pattern: ['intake', 'nerfstudio'], load: () => import('@/api/intake/nerfstudio/handler') },
  { pattern: ['intake', 'preview'], load: () => import('@/api/intake/preview/handler') },
  { pattern: ['intake', 'upload'], load: () => import('@/api/intake/upload/handler') },
  { pattern: ['intake', 'upload', 'detect'], load: () => import('@/api/intake/upload/detect/handler') },
  { pattern: ['intake', 'upload', 'detected'], load: () => import('@/api/intake/upload/detected/handler') },
  { pattern: ['legal', 'complexity'], load: () => import('@/api/legal/complexity/handler') },
  { pattern: ['market-data'], load: () => import('@/api/market-data/handler') },
  { pattern: ['ml', 'external-models'], load: () => import('@/api/ml/external-models/handler') },
  { pattern: ['mobility', 'accessibility'], load: () => import('@/api/mobility/accessibility/handler') },
  { pattern: ['models', 'status'], load: () => import('@/api/models/status/handler') },
  { pattern: ['projects'], load: () => import('@/api/projects/handler') },
  { pattern: ['projects', ':id'], load: () => import('@/api/projects/[id]/handler') },
  { pattern: ['properties'], load: () => import('@/api/properties/handler') },
  { pattern: ['properties', ':id'], load: () => import('@/api/properties/[id]/handler') },
  { pattern: ['proxy-glb'], load: () => import('@/api/proxy-glb/handler') },
  { pattern: ['runs'], load: () => import('@/api/runs/handler') },
  { pattern: ['runs', ':id'], load: () => import('@/api/runs/[id]/handler') },
  { pattern: ['runs', ':id', 'assets', ':assetPath*'], load: () => import('@/api/runs/[id]/assets/[...assetPath]/handler') },
  { pattern: ['runs', ':id', 'detect-doors'], load: () => import('@/api/runs/[id]/detect-doors/handler') },
  { pattern: ['runs', ':id', 'detect-furniture'], load: () => import('@/api/runs/[id]/detect-furniture/handler') },
  { pattern: ['runs', ':id', 'detect-rooms'], load: () => import('@/api/runs/[id]/detect-rooms/handler') },
  { pattern: ['runs', ':id', 'detect-walls'], load: () => import('@/api/runs/[id]/detect-walls/handler') },
  { pattern: ['runs', ':id', 'detect-windows'], load: () => import('@/api/runs/[id]/detect-windows/handler') },
  { pattern: ['runs', ':id', 'download', ':format'], load: () => import('@/api/runs/[id]/download/[format]/handler') },
  { pattern: ['runs', ':id', 'email'], load: () => import('@/api/runs/[id]/email/handler') },
  { pattern: ['runs', ':id', 'furniture', 'assets'], load: () => import('@/api/runs/[id]/furniture/assets/handler') },
  { pattern: ['runs', ':id', 'generate-3d'], load: () => import('@/api/runs/[id]/generate-3d/handler') },
  { pattern: ['runs', ':id', 'imported', 'upload'], load: () => import('@/api/runs/[id]/imported/upload/handler') },
  { pattern: ['runs', ':id', 'meta'], load: () => import('@/api/runs/[id]/meta/handler') },
  { pattern: ['runs', ':id', 'status'], load: () => import('@/api/runs/[id]/status/handler') },
  { pattern: ['runs', ':id', 'svg'], load: () => import('@/api/runs/[id]/svg/handler') },
  { pattern: ['runs', ':id', 'svg', 'raw'], load: () => import('@/api/runs/[id]/svg/raw/handler') },
  { pattern: ['sentiment', 'analysis'], load: () => import('@/api/sentiment/analysis/handler') },
  { pattern: ['sentiment', 'broker-graph'], load: () => import('@/api/sentiment/broker-graph/handler') },
  { pattern: ['stats'], load: () => import('@/api/stats/handler') },
  { pattern: ['system', 'status'], load: () => import('@/api/system/status/handler') },
  { pattern: ['valuation', 'comprehensive'], load: () => import('@/api/valuation/comprehensive/handler') },
  { pattern: ['valuations'], load: () => import('@/api/valuations/handler') },
  { pattern: ['valuations', 'batch'], load: () => import('@/api/valuations/batch/handler') },
  { pattern: ['valuations', ':id'], load: () => import('@/api/valuations/[id]/handler') },
  { pattern: ['workspace'], load: () => import('@/api/workspace/handler') },
  { pattern: ['ws', 'messages'], load: () => import('@/api/ws/messages/handler') },
];

function matchRoute(slug: string[]) {
  for (const route of apiRoutes) {
    const wildcardIndex = route.pattern.findIndex(
      (segment) => segment.startsWith(':') && segment.endsWith('*')
    );
    const hasWildcard = wildcardIndex >= 0;

    if (!hasWildcard && route.pattern.length !== slug.length) {
      continue;
    }
    if (hasWildcard && route.pattern.length - 1 > slug.length) {
      continue;
    }

    const params: Record<string, string> = {};
    let matches = true;

    for (let index = 0; index < route.pattern.length; index += 1) {
      const routeSegment = route.pattern[index];
      if (routeSegment.startsWith(':') && routeSegment.endsWith('*')) {
        params[routeSegment.slice(1, -1)] = slug.slice(index).join('/');
        break;
      }

      const slugSegment = slug[index];

      if (routeSegment.startsWith(':')) {
        params[routeSegment.slice(1)] = slugSegment;
        continue;
      }

      if (routeSegment !== slugSegment) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return { route, params };
    }
  }

  return null;
}

function allowHeader(routeModule: ApiRouteModule) {
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].filter(
    (method) => typeof routeModule[method] === 'function'
  );

  if (!methods.includes('OPTIONS')) {
    methods.push('OPTIONS');
  }

  return methods.join(', ');
}

function jsonError(status: number, code: string, message: string, headers?: HeadersInit) {
  return Response.json(
    {
      success: false,
      error: { code, message },
    },
    { status, headers }
  );
}

function getBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
}

function isBackendProxySlug(slug: string[]) {
  return slug.length > 0 && BACKEND_PROXY_PREFIXES.has(slug[0]);
}

async function proxyBackendRoute(request: Request, slug: string[]) {
  const url = new URL(request.url);
  const backendBaseUrl = getBackendBaseUrl();
  const backendUrl = new URL(`/api/${slug.join('/')}${url.search}`, backendBaseUrl);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.arrayBuffer();
    init.body = body.byteLength > 0 ? body : undefined;
  }

  try {
    const backendResponse = await fetch(backendUrl, init);
    const responseHeaders = new Headers(backendResponse.headers);

    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return jsonError(
      502,
      'BACKEND_UNAVAILABLE',
      error instanceof Error
        ? `Backend proxy failed: ${error.message}`
        : 'Backend proxy failed.'
    );
  }
}

export async function dispatchApiRoute(request: Request, slug: string[]) {
  const matchedRoute = matchRoute(slug);

  if (!matchedRoute) {
    if (isBackendProxySlug(slug)) {
      return proxyBackendRoute(request, slug);
    }
    return jsonError(404, 'NOT_FOUND', 'API route not found.');
  }

  const routeModule = await matchedRoute.route.load();
  const method = request.method.toUpperCase();
  const handler = routeModule[method] as ApiHandler | undefined;
  const allow = allowHeader(routeModule);

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { Allow: allow },
    });
  }

  if (!handler) {
    return jsonError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', {
      Allow: allow,
    });
  }

  return handler(request, {
    params: Promise.resolve(matchedRoute.params),
  });
}
