import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { convertObjectToSnakeCase } from '../../utils';

export const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;
export const getCreateOrRerunCourseUrl = () => new URL('course/', getApiBaseUrl()).href;

export const getCourseRerunUrl = (courseId: string) => new URL(
  `/api/contentstore/v1/course_rerun/${courseId}`,
  getApiBaseUrl(),
).href;

export const getOrganizationsUrl = () => new URL('organizations', getApiBaseUrl()).href;
export const getClipboardUrl = () => `${getApiBaseUrl()}/api/content-staging/v1/clipboard/`;

/**
 * ✅ CAMBIO CLAVE:
 * count_implicit YA NO va siempre.
 * Solo si includeImplicit=true.
 */
export const getTagsCountApiUrl = (contentPattern: string, includeImplicit: boolean = false) => {
  const url = new URL(
    `api/content_tagging/v1/object_tag_counts/${contentPattern}/`,
    getApiBaseUrl(),
  );

  if (includeImplicit) {
    url.searchParams.set('count_implicit', '');
  }

  return url.href;
};

/**
 * -----------------------------
 * ✅ PERF GUARD: tags count cache + dedupe + skip window
 * -----------------------------
 */

// Cache: pattern(+includeImplicit) -> { expiresAt, data }
type TagsCountCacheEntry = { expiresAt: number; data: Record<string, number> };
const TAGS_COUNT_CACHE = new Map<string, TagsCountCacheEntry>();

// Dedupe inflight: key -> Promise
const TAGS_COUNT_INFLIGHT = new Map<string, Promise<Record<string, number>>>();

// Skip window: key -> skipUntil timestamp (ms)
const TAGS_COUNT_SKIP_UNTIL = new Map<string, number>();

const TAGS_COUNT_TTL_MS = 60_000;
const TAGS_COUNT_SKIP_MS_DEFAULT = 10_000;

function normalizePattern(pattern: string): string {
  return String(pattern || '').trim();
}

function buildKey(pattern: string, includeImplicit: boolean) {
  return `${normalizePattern(pattern)}|implicit:${includeImplicit ? '1' : '0'}`;
}

export function __skipTagsCountImplicitForPattern(
  pattern: string,
  ms: number = TAGS_COUNT_SKIP_MS_DEFAULT,
  includeImplicit: boolean = true,
) {
  const key = buildKey(pattern, includeImplicit);
  const until = Date.now() + Math.max(0, ms);
  TAGS_COUNT_SKIP_UNTIL.set(key, until);
  // eslint-disable-next-line no-console
  console.debug('[TAGS_COUNT] skip enabled', { key, ms, until });
}

export function __clearTagsCountImplicitSkip(pattern: string, includeImplicit: boolean = true) {
  const key = buildKey(pattern, includeImplicit);
  TAGS_COUNT_SKIP_UNTIL.delete(key);
}

function getCache(key: string): Record<string, number> | null {
  const entry = TAGS_COUNT_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    TAGS_COUNT_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: Record<string, number>, ttlMs: number = TAGS_COUNT_TTL_MS) {
  TAGS_COUNT_CACHE.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Get's organizations data. Returns list of organization names.
 */
export async function getOrganizations(): Promise<string[]> {
  const { data } = await getAuthenticatedHttpClient().get(getOrganizationsUrl());
  return camelCaseObject(data);
}

/**
 * Get's course rerun data.
 */
export async function getCourseRerun(courseId: string): Promise<unknown> {
  const { data } = await getAuthenticatedHttpClient().get(getCourseRerunUrl(courseId));
  return camelCaseObject(data);
}

/**
 * Create or rerun course with data.
 */
export async function createOrRerunCourse(courseData: Object): Promise<unknown> {
  const { data } = await getAuthenticatedHttpClient().post(
    getCreateOrRerunCourseUrl(),
    convertObjectToSnakeCase(courseData, true),
  );
  return camelCaseObject(data);
}

export interface ClipboardStatus {
  content: {
    id: number;
    userId: number;
    created: string;
    purpose: 'clipboard';
    status: 'ready' | 'loading' | 'expired' | 'error';
    blockType: string;
    blockTypeDisplay: string;
    olxUrl: string;
    displayName: string;
  } | null;
  sourceUsageKey: string;
  sourceContextTitle: string;
  sourceEditUrl: string;
}

/**
 * Retrieves user's clipboard.
 */
export async function getClipboard(): Promise<ClipboardStatus> {
  const { data } = await getAuthenticatedHttpClient().get(getClipboardUrl());
  return camelCaseObject(data);
}

/**
 * Updates user's clipboard.
 */
export async function updateClipboard(usageKey: string): Promise<ClipboardStatus> {
  const { data } = await getAuthenticatedHttpClient().post(getClipboardUrl(), { usage_key: usageKey });
  return camelCaseObject(data);
}

/**
 * ✅ getTagsCount ahora permite includeImplicit
 * Por default: false (MUCHO más barato para cursos grandes)
 */
export async function getTagsCount(
  contentPattern?: string,
  includeImplicit: boolean = false,
): Promise<Record<string, number>> {
  if (!contentPattern) throw new Error('contentPattern is required');

  const pattern = normalizePattern(contentPattern);
  const key = buildKey(pattern, includeImplicit);

  // 0) Skip window
  const skipUntil = TAGS_COUNT_SKIP_UNTIL.get(key);
  if (skipUntil && Date.now() < skipUntil) {
    const cached = getCache(key);
    // eslint-disable-next-line no-console
    console.debug('[TAGS_COUNT] skipped (within window)', { key, skipUntil, hasCache: Boolean(cached) });
    return cached || {};
  }

  // 1) Cache hit
  const cached = getCache(key);
  if (cached) return cached;

  // 2) Inflight dedupe
  const inflight = TAGS_COUNT_INFLIGHT.get(key);
  if (inflight) return inflight;

  // 3) Request + cache
  const req = (async () => {
    try {
      const { data } = await getAuthenticatedHttpClient().get(
        getTagsCountApiUrl(pattern, includeImplicit),
      );
      setCache(key, data, TAGS_COUNT_TTL_MS);
      return data;
    } finally {
      TAGS_COUNT_INFLIGHT.delete(key);
    }
  })();

  TAGS_COUNT_INFLIGHT.set(key, req);
  return req;
}
