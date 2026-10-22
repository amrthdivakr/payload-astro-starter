import type { APIRoute } from 'astro';
import { PAYLOAD_URL, PREVIEW_SECRET } from 'astro:env/server';

const PREVIEW_COOKIE = 'payload-preview';
const TOKEN_COOKIE = 'payload-token';

function isSafeRelativePath(path: string): boolean {
  if (!path.startsWith('/')) {
    return false;
  }
  if (path.startsWith('//')) {
    return false;
  }
  if (path.includes('://')) {
    return false;
  }
  return true;
}

type UsersMeBody = {
  user?: { id?: string | number } | null;
  id?: string | number;
};

function userFromMeBody(body: UsersMeBody): boolean {
  if (body.user && body.user.id != null) {
    return true;
  }
  if (body.id != null && body.user === undefined) {
    return true;
  }
  return false;
}

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const { searchParams } = new URL(request.url);

  const previewSecret = searchParams.get('previewSecret');
  if (!PREVIEW_SECRET || previewSecret !== PREVIEW_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }

  const path = searchParams.get('path');
  if (!path) {
    return new Response('Bad request', { status: 400 });
  }

  if (!isSafeRelativePath(path)) {
    return new Response('Invalid preview path', { status: 500 });
  }

  const token = searchParams.get('token');
  if (!token) {
    return new Response('Forbidden', { status: 403 });
  }

  const origin = PAYLOAD_URL.replace(/\/+$/, '');
  const meResponse = await fetch(`${origin}/api/users/me`, {
    headers: {
      Authorization: `JWT ${token}`,
    },
  });

  if (!meResponse.ok) {
    return new Response('Forbidden', { status: 403 });
  }

  let meBody: UsersMeBody;
  try {
    meBody = (await meResponse.json()) as UsersMeBody;
  } catch {
    return new Response('Forbidden', { status: 403 });
  }

  if (!userFromMeBody(meBody)) {
    return new Response('Forbidden', { status: 403 });
  }

  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
  };

  cookies.set(PREVIEW_COOKIE, '1', cookieOptions);
  cookies.set(TOKEN_COOKIE, token, cookieOptions);

  return redirect(path, 302);
};
