import { dispatchApiRoute } from '@/api/router';

type Params = {
  slug?: string | string[];
};

async function handleApi(request: Request, context: { params: Params }) {
  const slugParam = context?.params?.slug;
  const slug = Array.isArray(slugParam)
    ? slugParam
    : slugParam
    ? [slugParam]
    : [];

  return dispatchApiRoute(request, slug);
}

export const GET = handleApi;
export const POST = handleApi;
export const PUT = handleApi;
export const PATCH = handleApi;
export const DELETE = handleApi;
export const HEAD = handleApi;
export const OPTIONS = handleApi;
