// MadeInMagius PixEz Pulse — Community Tag Category Overrides & Curation API (Plan A)
// GET  /api/tag-overrides         -> Live public community overrides JSON (CORS *, 60s CDN cache)
// POST /api/tag-overrides         -> action: "publish" (admin passcode -> commits to repo JSON via GitHub Contents API)
//                                 -> action: "suggest" (open community submission -> creates GitHub Issue or returns prefilled Issue URL)

const REPO = 'HiiragiNemu/madeinmagius-site';
const FILE_PATH = 'pixez/community-tag-overrides.json';
const BRANCH = 'main';
const ALLOWED_CATEGORIES = new Set([
  'character',
  'attribute_xp',
  'series_ip',
  'meta_general',
  'ai_meta',
  'bookmark_milestone',
]);
const CATEGORY_LABELS = {
  character: '角色',
  attribute_xp: '属性',
  series_ip: '作品',
  meta_general: '元标签',
  ai_meta: 'AI标签',
  bookmark_milestone: '收藏',
};

const SEED_FALLBACK = {
  schema: 'madeinmagius-tag-overrides/v1',
  updatedAt: '2026-11-26T03:42:00Z',
  overrides: {
    '臭がる': {
      from: 'character',
      to: 'attribute_xp',
      note: '日语送假名动词/形容词非角色名',
      updatedAt: '2026-11-26T03:42:00Z',
    },
  },
};

function corsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, X-Curation-Passcode',
    'x-content-type-options': 'nosniff',
    ...extra,
  };
}

function jsonRes(body, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status,
    headers: corsHeaders({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
    }),
  });
}

function githubHeaders(token) {
  const h = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'MadeInMagius-TagCuration/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  const len = Math.max(sa.length, sb.length);
  let diff = sa.length ^ sb.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0 && sa.length > 0;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const clean = String(b64 || '').replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function sanitizeTag(raw) {
  const s = String(raw || '').replace(/[\r\n\t\x00-\x1F]+/g, ' ').trim();
  if (!s || s.length > 80) return '';
  return s;
}

function sanitizeNote(raw, maxLen = 120) {
  return String(raw || '').replace(/[\r\n\t\x00-\x1F]+/g, ' ').trim().slice(0, maxLen);
}

function validateItems(rawItems, maxItems, allowDelete = false) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];
  const out = [];
  const seen = new Set();
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const tag = sanitizeTag(item.tag);
    if (!tag || seen.has(tag)) continue;
    const to = item.to === null && allowDelete ? null : String(item.to || '').trim();
    if (to !== null && !ALLOWED_CATEGORIES.has(to)) continue;
    const fromRaw = String(item.from || '').trim();
    const from = ALLOWED_CATEGORIES.has(fromRaw) ? fromRaw : '';
    const note = sanitizeNote(item.note, 120);
    seen.add(tag);
    out.push({ tag, from, to, note });
    if (out.length >= maxItems) break;
  }
  return out;
}

async function loadLiveOverrides(context) {
  const token = context.env?.TAG_CURATION_GITHUB_TOKEN || context.env?.GITHUB_RELEASES_TOKEN || '';
  // 1) Try GitHub Contents API directly so freshly published overrides are visible immediately (before CF Pages rebuild!)
  try {
    const r = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
      { headers: githubHeaders(token) },
    );
    if (r.ok) {
      const data = await r.json();
      if (data && typeof data.content === 'string') {
        const parsed = JSON.parse(base64ToUtf8(data.content));
        if (parsed && typeof parsed.overrides === 'object') {
          return { doc: parsed, sha: data.sha || '', source: 'github-live' };
        }
      }
    }
  } catch (_) {}

  // 2) Fallback to deployed static asset on the same Cloudflare Pages origin
  try {
    const u = new URL('/pixez/community-tag-overrides.json', context.request.url);
    const r = await fetch(u.toString());
    if (r.ok) {
      const parsed = await r.json();
      if (parsed && typeof parsed.overrides === 'object') {
        return { doc: parsed, sha: '', source: 'static-asset' };
      }
    }
  } catch (_) {}

  return { doc: SEED_FALLBACK, sha: '', source: 'seed-fallback' };
}

function buildSuggestIssueBody(items, submitter, comment) {
  const lines = [
    '### PixEz Pulse 社区 Tag 分类纠错建议',
    '',
    submitter ? `- 提交者备注: ${submitter}` : '- 提交方式: 匿名/社区直投',
    comment ? `- 补充说明: ${comment}` : '',
    `- 条目数量: ${items.length} 条`,
    '',
    '| 标签 | 原分类 | 建议修正为 | 备注 |',
    '| --- | --- | --- | --- |',
  ].filter((l) => l !== '');

  for (const it of items) {
    const safeTag = it.tag.replace(/\|/g, '\\|');
    const fromLbl = it.from ? `${CATEGORY_LABELS[it.from] || it.from} (\`${it.from}\`)` : '—';
    const toLbl = `${CATEGORY_LABELS[it.to] || it.to} (\`${it.to}\`)`;
    const safeNote = (it.note || '—').replace(/\|/g, '\\|');
    lines.push(`| \`${safeTag}\` | ${fromLbl} | ${toLbl} | ${safeNote} |`);
  }

  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({ items }, null, 2));
  lines.push('```');
  return lines.join('\n');
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const { doc, source } = await loadLiveOverrides(context);
  const overrides = doc && typeof doc.overrides === 'object' && doc.overrides ? doc.overrides : {};
  return jsonRes(
    {
      schema: 'madeinmagius-tag-overrides/v1',
      source,
      updatedAt: doc?.updatedAt || new Date().toISOString(),
      count: Object.keys(overrides).length,
      canPublish: Boolean(context.env?.TAG_CURATION_PASSCODE),
      canSuggest: true,
      overrides,
    },
    200,
    'public, max-age=60, s-maxage=60',
  );
}

export async function onRequestPost(context) {
  let payload = null;
  try {
    payload = await context.request.json();
  } catch (_) {
    return jsonRes({ error: true, message: '请求 JSON 格式无效' }, 400);
  }

  const action = String(payload?.action || '').trim().toLowerCase();
  const token = context.env?.TAG_CURATION_GITHUB_TOKEN || context.env?.GITHUB_RELEASES_TOKEN || '';

  if (action === 'suggest') {
    const items = validateItems(payload?.items, 50, false);
    if (!items.length) {
      return jsonRes({ error: true, message: '请至少选择 1 条有效的分类纠错记录再提交' }, 400);
    }
    const submitter = sanitizeNote(payload?.submitter, 32);
    const comment = sanitizeNote(payload?.comment, 260);
    const previewTags = items.slice(0, 3).map((x) => x.tag).join(', ');
    const title = `[Tag纠错建议] ${previewTags}${items.length > 3 ? ` 等 ${items.length} 条` : ''}`;
    const body = buildSuggestIssueBody(items, submitter, comment);
    const fallbackUrl =
      `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body.slice(0, 3500))}`;

    if (token) {
      try {
        const ir = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
          method: 'POST',
          headers: {
            ...githubHeaders(token),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, body }),
        });
        if (ir.ok) {
          const created = await ir.json();
          return jsonRes({
            ok: true,
            mode: 'issue_created',
            count: items.length,
            issueNumber: created.number,
            issueUrl: created.html_url,
            message: `已提交 ${items.length} 条纠错建议至待审队列 (#${created.number})，审核合并后全站生效！`,
          });
        }
      } catch (_) {}
    }

    return jsonRes({
      ok: true,
      mode: 'prefilled_url',
      count: items.length,
      fallbackUrl,
      message: `已生成 ${items.length} 条待审纠错建议单，点击确认即可在 GitHub 提交给站长审核。`,
    });
  }

  if (action === 'publish') {
    const expectedPass = String(context.env?.TAG_CURATION_PASSCODE || '').trim();
    if (!expectedPass) {
      return jsonRes(
        {
          error: true,
          code: 'PASSCODE_UNCONFIGURED',
          message: '站长尚未在 Cloudflare Pages 环境变量中配置 TAG_CURATION_PASSCODE 口令，暂不可直接发布全站词表（请先在 CF Pages -> Settings -> Variables 添加 TAG_CURATION_PASSCODE）。',
        },
        503,
      );
    }
    const givenPass = String(
      payload?.passcode || context.request.headers.get('x-curation-passcode') || '',
    ).trim();
    if (!constantTimeEqual(givenPass, expectedPass)) {
      return jsonRes({ error: true, code: 'INVALID_PASSCODE', message: '管理员口令错误，已拒绝写入全站公共词表' }, 403);
    }
    if (!token) {
      return jsonRes(
        {
          error: true,
          code: 'TOKEN_MISSING',
          message: 'Cloudflare Pages 缺少具有仓库写入权限的 Token（需配置 TAG_CURATION_GITHUB_TOKEN 或为 GITHUB_RELEASES_TOKEN 开启 madeinmagius-site Contents 读写权限）。',
        },
        503,
      );
    }

    const items = validateItems(payload?.items, 200, true);
    if (!items.length) {
      return jsonRes({ error: true, message: '没有可发布的有效分类纠错条目' }, 400);
    }

    // Fetch latest file + sha from GitHub Contents API
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
      { headers: githubHeaders(token) },
    );
    let currentDoc = { schema: 'madeinmagius-tag-overrides/v1', updatedAt: '', overrides: {} };
    let currentSha = '';
    if (getRes.ok) {
      const gd = await getRes.json();
      currentSha = gd.sha || '';
      try {
        const parsed = JSON.parse(base64ToUtf8(gd.content));
        if (parsed && typeof parsed.overrides === 'object') currentDoc = parsed;
      } catch (_) {}
    } else if (getRes.status !== 404) {
      return jsonRes(
        { error: true, message: `读取仓库公共词表失败 (HTTP ${getRes.status})` },
        502,
      );
    }

    const nowIso = new Date().toISOString();
    const merged = { ...(currentDoc.overrides || {}) };
    let applied = 0;
    let removed = 0;
    for (const it of items) {
      if (it.to === null) {
        if (Object.prototype.hasOwnProperty.call(merged, it.tag)) {
          delete merged[it.tag];
          removed += 1;
        }
      } else {
        merged[it.tag] = {
          ...(it.from ? { from: it.from } : {}),
          to: it.to,
          ...(it.note ? { note: it.note } : {}),
          updatedAt: nowIso,
        };
        applied += 1;
      }
    }

    const sortedOverrides = Object.fromEntries(
      Object.keys(merged)
        .sort((a, b) => a.localeCompare(b, 'ja'))
        .map((k) => [k, merged[k]]),
    );
    const nextDoc = {
      schema: 'madeinmagius-tag-overrides/v1',
      updatedAt: nowIso,
      overrides: sortedOverrides,
    };
    const nextJson = JSON.stringify(nextDoc, null, 2) + '\n';
    const sampleTags = items.slice(0, 4).map((x) => x.tag).join(', ');
    const commitMsg = `chore(pixez): update community tag overrides (${applied} updated, ${removed} removed: ${sampleTags})`;

    const putBody = {
      message: commitMsg,
      content: utf8ToBase64(nextJson),
      branch: BRANCH,
      ...(currentSha ? { sha: currentSha } : {}),
    };
    const putRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          ...githubHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putBody),
      },
    );

    if (!putRes.ok) {
      const errTxt = await putRes.text().catch(() => '');
      const hint =
        putRes.status === 403 || putRes.status === 404
          ? '（请检查 Cloudflare Pages 环境变量 TAG_CURATION_GITHUB_TOKEN / GITHUB_RELEASES_TOKEN 是否具备 madeinmagius-site 的 Contents: Read and write 权限）'
          : '';
      return jsonRes(
        {
          error: true,
          status: putRes.status,
          message: `写入全站公共词表失败 (HTTP ${putRes.status})${hint} ${errTxt.slice(0, 140)}`,
        },
        putRes.status === 409 ? 409 : 502,
      );
    }

    const putData = await putRes.json().catch(() => ({}));
    return jsonRes({
      ok: true,
      applied,
      removed,
      totalCount: Object.keys(sortedOverrides).length,
      updatedAt: nowIso,
      commitUrl: putData?.commit?.html_url || null,
      overrides: sortedOverrides,
      message: `已成功发布 ${applied} 条全站公共纠错（共 ${Object.keys(sortedOverrides).length} 条），所有网页端与 APK 用户将自动同步生效！`,
    });
  }

  return jsonRes({ error: true, message: '不支持的 action，请使用 publish 或 suggest' }, 400);
}
