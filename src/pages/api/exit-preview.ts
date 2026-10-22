import type { APIRoute } from 'astro';

const PREVIEW_COOKIE = 'payload-preview';
const TOKEN_COOKIE = 'payload-token';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(PREVIEW_COOKIE, { path: '/' });
  cookies.delete(TOKEN_COOKIE, { path: '/' });

  return redirect('/', 302);
};
