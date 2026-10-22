import type { APIRoute } from 'astro';
import { REVALIDATE_SECRET } from 'astro:env/server';

export const POST: APIRoute = async ({ request, cache }) => {
  cache.set(false);

  const auth = request.headers.get('Authorization');
  const expected = `Bearer ${REVALIDATE_SECRET}`;

  if (!REVALIDATE_SECRET || auth !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await cache.invalidate({ tags: ['payload'] });

  return new Response(JSON.stringify({ revalidated: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
