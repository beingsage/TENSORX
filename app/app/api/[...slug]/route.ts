import { dispatchApiRoute } from '@/api/router';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

async function handle(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return dispatchApiRoute(request, slug);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
