const SOURCE_REPO = 'HiiragiNemu/Bilibili-Follower-Snapshot';
const SOURCE_PATH = 'bilibili_follower_snapshot_public.js';

function headers(token) {
  return {
    Accept: 'application/vnd.github.raw+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'MadeInMagius-Site/2.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function fetchSource(token) {
  const response = await fetch(
    `https://api.github.com/repos/${SOURCE_REPO}/contents/${SOURCE_PATH}?ref=main`,
    { headers: headers(token) },
  );
  if (!response.ok) throw new Error(`GitHub source fetch failed: ${response.status}`);
  return response.text();
}

function error(message, status) {
  return new Response(message + '\n', {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function serve(context, asText) {
  const token = context.env.GITHUB_RELEASES_TOKEN;
  if (!token) return error('Console mirror is not configured yet.', 503);

  try {
    const source = await fetchSource(token);
    return new Response(source, {
      status: 200,
      headers: {
        'content-type': asText ? 'text/plain; charset=utf-8' : 'text/javascript; charset=utf-8',
        'content-disposition': asText ? 'inline' : 'inline',
        'cache-control': 'public, max-age=300, s-maxage=300',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : 'Console mirror error.', 502);
  }
}

export function onRequestGet(context) {
  return serve(context, true);
}
