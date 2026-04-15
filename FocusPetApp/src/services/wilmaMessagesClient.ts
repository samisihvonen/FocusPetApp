/**
 * Wilma messages client for React Native.
 * Implements the same auth flow as @wilm-ai/wilma-client but using axios
 * with manual cookie handling (compatible with React Native).
 *
 * Login flow:
 *  1. GET /login  â†’ extract hidden form fields (SESSIONID etc.)
 *  2. POST /login â†’ get Wilma2SID cookie
 *  3. GET /messages/list + /messages/list/archive in parallel â†’ merge & sort
 */

import axios from 'axios';
import { WILMA_ROLE_PATH } from '../config/secrets';

export type WilmaMessage = {
  wilmaId: number;
  subject: string;
  sentAt: string; // formatted Finnish date string
  sentAtDate: Date | null; // parsed Date for sorting
  senderName: string | null;
  folder: string;
  isRead: boolean;
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function extractBaseUrl(url: string): string {
  try {
    const u = new URL(url.replace(/^webcal:\/\//i, 'https://'));
    return `${u.protocol}//${u.host}`;
  } catch {
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  }
}

function parseCookiesFromHeaders(setCookieHeader: string | string[]): string {
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  return headers
    .map(h => h.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function mergeCookieStrings(baseCookie: string, extraCookie: string): string {
  const merged = new Map<string, string>();

  for (const part of baseCookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) {
      merged.set(k.trim(), v.join('='));
    }
  }
  for (const part of extraCookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) {
      merged.set(k.trim(), v.join('='));
    }
  }

  return Array.from(merged.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function hasLoginPageMarkers(html: string): boolean {
  const normalized = html.toLowerCase();
  return (
    normalized.includes('<title>wilmaan kirjautuminen') ||
    normalized.includes('name="login"') ||
    normalized.includes("name='login'") ||
    normalized.includes('name="password"') ||
    normalized.includes("name='password'")
  );
}

/** Extract hidden form field values from login page HTML */
function parseLoginFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const inputRegex = /<input[^>]+>/gi;
  const matches = html.match(inputRegex) ?? [];
  for (const tag of matches) {
    const name = /name=['"]([^'"]+)['"]/i.exec(tag)?.[1];
    if (!name || name === 'Login' || name === 'Password') {
      continue;
    }
    const type =
      /type=['"]([^'"]+)['"]/i.exec(tag)?.[1]?.toLowerCase() ?? 'text';
    if (type === 'hidden' || type === 'submit') {
      const value = /value=['"]([^'"]*)['"]/i.exec(tag)?.[1] ?? '';
      fields[name] = value;
    }
  }
  return fields;
}

function normalizeMessageList(data: unknown): Array<Record<string, unknown>> {
  const looksLikeMessageArray = (arr: unknown[]): boolean =>
    arr.some(item => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const obj = item as Record<string, unknown>;
      return (
        obj['id'] !== undefined ||
        obj['Id'] !== undefined ||
        obj['messageId'] !== undefined ||
        obj['MessageId'] !== undefined ||
        obj['subject'] !== undefined ||
        obj['Subject'] !== undefined ||
        obj['topic'] !== undefined ||
        obj['Topic'] !== undefined ||
        obj['title'] !== undefined ||
        obj['Title'] !== undefined
      );
    });

  const searchNested = (
    value: unknown,
    depth: number,
  ): Array<Record<string, unknown>> => {
    if (depth > 4 || !value || typeof value !== 'object') {
      return [];
    }
    if (Array.isArray(value)) {
      return looksLikeMessageArray(value)
        ? (value as Array<Record<string, unknown>>)
        : [];
    }
    const obj = value as Record<string, unknown>;
    for (const nested of Object.values(obj)) {
      const found = searchNested(nested, depth + 1);
      if (found.length > 0) {
        return found;
      }
    }
    return [];
  };

  if (Array.isArray(data)) {
    return looksLikeMessageArray(data)
      ? (data as Array<Record<string, unknown>>)
      : [];
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // Try all known Wilma response envelope keys
    const list =
      obj['Messages'] ??
      obj['messages'] ??
      obj['Inbox'] ??
      obj['inbox'] ??
      obj['Items'] ??
      obj['items'] ??
      obj['Data'] ??
      obj['data'];
    if (Array.isArray(list)) {
      return list as Array<Record<string, unknown>>;
    }

    const nested = searchNested(obj, 0);
    if (nested.length > 0) {
      return nested;
    }
  }
  return [];
}

function isHtmlResponse(data: unknown): boolean {
  if (typeof data !== 'string') {
    return false;
  }
  const trimmed = data.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

/**
 * Parse Wilma timestamp strings into a Date.
 * Wilma uses formats like "10.4.2026 14:23" (Finnish) or ISO strings.
 */
function parseWilmaDate(raw: string): Date | null {
  if (!raw) return null;
  // Finnish: "10.4.2026 14:23" or "10.4.2026"
  const finnishMatch =
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(raw);
  if (finnishMatch) {
    const [, d, mo, y, h = '0', min = '0'] = finnishMatch;
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(min),
    );
  }
  // ISO or other standard format
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

function parseRawMessages(data: unknown, folder: string): WilmaMessage[] {
  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  return normalizeMessageList(data).flatMap((item, idx) => {
    try {
      const wilmaIdRaw =
        item['id'] ??
        item['Id'] ??
        item['messageId'] ??
        item['MessageId'] ??
        item['ThreadId'] ??
        item['threadId'] ??
        item['ConversationId'] ??
        item['conversationId'] ??
        0;
      const subject = String(
        item['Subject'] ?? item['subject'] ?? '(ei aihetta)',
      )
        .replace(/\s+/g, ' ')
        .trim();
      const subjectFallback = String(
        item['Topic'] ??
          item['topic'] ??
          item['Title'] ??
          item['title'] ??
          item['Caption'] ??
          item['caption'] ??
          subject,
      )
        .replace(/\s+/g, ' ')
        .trim();
      const rawTime = String(
        item['Time'] ??
          item['TimeStamp'] ??
          item['Timestamp'] ??
          item['timestamp'] ??
          item['SentAt'] ??
          item['sentAt'] ??
          item['Date'] ??
          item['date'] ??
          item['Created'] ??
          item['created'] ??
          item['CreatedAt'] ??
          item['createdAt'] ??
          item['Modified'] ??
          item['modified'] ??
          '',
      );
      const sentAtDate = parseWilmaDate(rawTime);
      const rawSender =
        item['SenderName'] ??
        item['Sender'] ??
        item['sender'] ??
        item['From'] ??
        item['FromName'] ??
        item['fromName'] ??
        item['Author'] ??
        item['author'] ??
        null;
      const senderName = rawSender ? String(rawSender).trim() : null;

      const status =
        item['Status'] ??
        item['status'] ??
        item['Read'] ??
        item['read'] ??
        item['IsRead'] ??
        item['isRead'] ??
        item['Unread'] ??
        item['unread'];

      let isRead = true;
      if (status !== undefined) {
        if (typeof status === 'boolean') {
          isRead = status;
        } else if (typeof status === 'string') {
          const s = status.toLowerCase();
          if (s === 'false' || s === '0' || s === 'unread') {
            isRead = false;
          } else if (s === 'true' || s === '1' || s === 'read') {
            isRead = true;
          }
        } else if (typeof status === 'number') {
          isRead = status !== 0;
        }
      }

      const numericId = Number(wilmaIdRaw);
      const wilmaId =
        Number.isFinite(numericId) && numericId > 0
          ? numericId
          : hash(`${folder}|${subjectFallback}|${rawTime}|${idx}`);

      return [
        {
          wilmaId,
          subject: subjectFallback || '(ei aihetta)',
          sentAt: sentAtDate ? formatDate(sentAtDate) : rawTime,
          sentAtDate,
          senderName,
          folder,
          isRead,
        },
      ];
    } catch {
      return [];
    }
  });
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtml(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHtmlTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? stripHtml(m[1]).trim().slice(0, 100) : '(no title)';
}

function parseHtmlMessages(html: string, folder: string): WilmaMessage[] {
  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  const linkRegexes = [
    /<a[^>]+href=["'][^"']*\/messages(?:\/(?:show|view))?\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+href=["'][^"']*\/messages\?id=(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+data-message-id=["'](\d+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+href=["'](?:\.\/)?(\d{1,12})(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi,
  ];
  const out: WilmaMessage[] = [];
  const seen = new Set<number>();

  for (const linkRegex of linkRegexes) {
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null) {
      const numericId = Number(match[1]);
      const subject = stripHtml(match[2]);
      if (!subject) {
        continue;
      }

      const wilmaId =
        Number.isFinite(numericId) && numericId > 0
          ? numericId
          : hash(`${folder}|${subject}|${match.index}`);
      if (seen.has(wilmaId)) {
        continue;
      }

      const idx = match.index;
      const snippet = html.slice(Math.max(0, idx - 260), idx + 420);
      const dateText =
        /(\d{1,2}\.\d{1,2}\.\d{4}(?:\s+\d{1,2}:\d{2})?)/.exec(snippet)?.[1] ??
        '';
      const sentAtDate = parseWilmaDate(dateText);

      const senderRaw =
        /(?:lahettaja|lähettäjä|sender|from)[^>]*>[\s\S]*?<\/[^>]+>\s*<[^>]*>([\s\S]*?)<\//i.exec(
          snippet,
        )?.[1] ??
        /class=["'][^"']*(?:sender|from)[^"']*["'][^>]*>([\s\S]*?)<\//i.exec(
          snippet,
        )?.[1] ??
        '';
      const senderName = stripHtml(senderRaw) || null;

      const isUnread = /\bunread\b|\bnot-read\b|\buusi\b/i.test(
        match[0] + snippet,
      );

      out.push({
        wilmaId,
        subject,
        sentAt: sentAtDate ? formatDate(sentAtDate) : dateText,
        sentAtDate,
        senderName,
        folder,
        isRead: !isUnread,
      });
      seen.add(wilmaId);
    }
  }

  // Broad fallback for Wilma variants where message links are not numeric IDs.
  // Example: href may be relative or contain non-numeric message identifiers.
  const broadAnchorRegex =
    /<a[^>]+href=["']([^"']*messages[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = broadAnchorRegex.exec(html)) !== null) {
    const href = anchorMatch[1] ?? '';
    const subject = stripHtml(anchorMatch[2]);
    if (!subject || subject.length < 2) {
      continue;
    }

    // Skip obvious navigation labels.
    if (
      /^(viestit|saapuneet|arkisto|lähetetyt|lahetetyt|uusi viesti)$/i.test(
        subject,
      )
    ) {
      continue;
    }

    const hrefId = /(\d{1,12})/.exec(href)?.[1];
    const numericId = hrefId ? Number(hrefId) : NaN;
    const wilmaId =
      Number.isFinite(numericId) && numericId > 0
        ? numericId
        : hash(`${folder}|${href}|${subject}|${anchorMatch.index}`);

    if (seen.has(wilmaId)) {
      continue;
    }

    const idx = anchorMatch.index;
    const snippet = html.slice(Math.max(0, idx - 260), idx + 420);
    const dateText =
      /(\d{1,2}\.\d{1,2}\.\d{4}(?:\s+\d{1,2}:\d{2})?)/.exec(snippet)?.[1] ?? '';
    const sentAtDate = parseWilmaDate(dateText);

    const senderRaw =
      /(?:lahettaja|lähettäjä|sender|from)[^>]*>[\s\S]*?<\/[^>]+>\s*<[^>]*>([\s\S]*?)<\//i.exec(
        snippet,
      )?.[1] ??
      /class=["'][^"']*(?:sender|from)[^"']*["'][^>]*>([\s\S]*?)<\//i.exec(
        snippet,
      )?.[1] ??
      '';
    const senderName = stripHtml(senderRaw) || null;

    const isUnread = /\bunread\b|\bnot-read\b|\buusi\b/i.test(
      anchorMatch[0] + snippet,
    );

    out.push({
      wilmaId,
      subject,
      sentAt: sentAtDate ? formatDate(sentAtDate) : dateText,
      sentAtDate,
      senderName,
      folder,
      isRead: !isUnread,
    });
    seen.add(wilmaId);
  }

  return out;
}

// â”€â”€â”€ Auth helper (login once, return cookie) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function wilmaLogin(
  baseUrl: string,
  username: string,
  password: string,
): Promise<{
  cookieString: string;
  rolePaths: string[];
  dashboardHtml: string;
}> {
  const extractRolePathFromUrl = (url: string): string | null => {
    const normalized = url.replace(/\\\//g, '/');
    const m = /\/![^/?#]+\/?/.exec(normalized);
    if (!m) {
      return null;
    }
    const p = m[0].startsWith('/') ? m[0] : `/${m[0]}`;
    return p.endsWith('/') ? p : `${p}/`;
  };

  const extractRolePaths = (html: string): string[] => {
    const normalized = html.replace(/\\\//g, '/');
    const set = new Set<string>();

    const regex = /["'](\/![^\/"']+\/?)["']/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(normalized)) !== null) {
      const p = m[1].startsWith('/') ? m[1] : `/${m[1]}`;
      set.add(p.endsWith('/') ? p : `${p}/`);
    }

    // Some pages only embed links like /!role/messages/list...
    const msgRegex = /(\/![^\/"'\s]+\/)messages\/list/gi;
    while ((m = msgRegex.exec(normalized)) !== null) {
      const p = m[1].startsWith('/') ? m[1] : `/${m[1]}`;
      set.add(p.endsWith('/') ? p : `${p}/`);
    }

    // Some tenants use /!role/messages without /list.
    const msgRegexAlt = /(\/![^\/"'\s]+\/)messages(?:\b|\/)/gi;
    while ((m = msgRegexAlt.exec(normalized)) !== null) {
      const p = m[1].startsWith('/') ? m[1] : `/${m[1]}`;
      set.add(p.endsWith('/') ? p : `${p}/`);
    }

    return Array.from(set);
  };

  const UA = BROWSER_UA;
  let cookieJar = '';

  // Step 1: GET login page → hidden fields
  // Cache-Control headers prevent React Native from caching the SESSIONID
  // (SESSIONID is single-use — a cached response causes every other login to fail)
  let hiddenFields: Record<string, string> = {};
  try {
    const loginPageResp = await axios.get<string>(`${baseUrl}/login`, {
      timeout: 15000,
      responseType: 'text',
      maxRedirects: 5,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'User-Agent': UA,
      },
    });
    const setCookie = loginPageResp.headers['set-cookie'];
    if (setCookie) {
      cookieJar = mergeCookieStrings(
        cookieJar,
        parseCookiesFromHeaders(setCookie),
      );
    }
    hiddenFields = parseLoginFormFields(loginPageResp.data);
  } catch {
    // Proceed with empty fields
  }

  // Step 1b: If SESSIONID missing, try /token
  if (!hiddenFields['SESSIONID']) {
    try {
      const tokenResp = await axios.get<unknown>(`${baseUrl}/token`, {
        timeout: 10000,
        headers: {
          Cookie: cookieJar,
          'User-Agent': UA,
        },
      });
      const tokenSetCookie = tokenResp.headers['set-cookie'];
      if (tokenSetCookie) {
        cookieJar = mergeCookieStrings(
          cookieJar,
          parseCookiesFromHeaders(tokenSetCookie),
        );
      }
      const tokenData = tokenResp.data;
      let sessionId: string | undefined;
      if (tokenData && typeof tokenData === 'object') {
        sessionId = (tokenData as Record<string, unknown>)['Wilma2LoginID'] as
          | string
          | undefined;
      }
      if (!sessionId && typeof tokenData === 'string') {
        sessionId = /"Wilma2LoginID"\s*:\s*"([^"\s]+)"/.exec(tokenData)?.[1];
      }
      if (sessionId) {
        hiddenFields['SESSIONID'] = sessionId;
      }
    } catch {
      // ignore
    }
  }

  // Step 2: POST login
  const formParams = new URLSearchParams({
    ...hiddenFields,
    Login: username,
    Password: password,
  });

  let cookieString = '';
  let dashboardHtml = '';

  try {
    const loginResp = await axios.post<string>(
      `${baseUrl}/login`,
      formParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          Cookie: cookieJar,
          Referer: `${baseUrl}/login`,
          Origin: baseUrl,
        },
        maxRedirects: 10,
        timeout: 15000,
        responseType: 'text',
      },
    );
    const setCookie = loginResp.headers['set-cookie'];
    if (setCookie) {
      cookieString = mergeCookieStrings(
        cookieJar,
        parseCookiesFromHeaders(setCookie),
      );
    } else {
      cookieString = cookieJar;
    }
    if (typeof loginResp.data === 'string') {
      dashboardHtml = loginResp.data;
    }

    const responseUrl = (loginResp as { request?: { responseURL?: string } })
      .request?.responseURL;
    if (responseUrl) {
      const p = extractRolePathFromUrl(responseUrl);
      if (p) {
        dashboardHtml += `\n"${p}"`;
      }
    }
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { headers?: Record<string, unknown>; data?: unknown };
    };
    const setCookie = axiosErr?.response?.headers?.['set-cookie'];
    if (setCookie) {
      cookieString = mergeCookieStrings(
        cookieJar,
        parseCookiesFromHeaders(setCookie as string | string[]),
      );
    } else {
      cookieString = cookieJar;
    }
    if (typeof axiosErr?.response?.data === 'string') {
      dashboardHtml = axiosErr.response.data;
    }

    const responseUrl = (
      axiosErr as { response?: { request?: { responseURL?: string } } }
    )?.response?.request?.responseURL;
    if (responseUrl) {
      const p = extractRolePathFromUrl(responseUrl);
      if (p) {
        dashboardHtml += `\n"${p}"`;
      }
    }
  }

  if (!cookieString || !cookieString.includes('Wilma2SID')) {
    throw new Error(
      'Kirjautuminen ep\u00e4onnistui. Tarkista k\u00e4ytt\u00e4j\u00e4tunnus ja salasana.',
    );
  }

  if (dashboardHtml && hasLoginPageMarkers(dashboardHtml)) {
    throw new Error(
      'Wilma palautti kirjautumissivun kirjautumisen jalkeen. Tarkista Wilma-tunnus, salasana ja kirjautumiscookiet.',
    );
  }

  // Step 3: Resolve all role paths (e.g. /!12345678/, /!98765432/).
  // Parent accounts with multiple children can have multiple role roots.
  const roleSet = new Set<string>(extractRolePaths(dashboardHtml));
  if (roleSet.size === 0) {
    try {
      const homeResp = await axios.get<string>(`${baseUrl}/`, {
        headers: {
          Cookie: cookieString,
          Accept: 'text/html,application/xhtml+xml',
          'Cache-Control': 'no-cache',
        },
        timeout: 10000,
        maxRedirects: 10,
        responseType: 'text',
      });
      const html = typeof homeResp.data === 'string' ? homeResp.data : '';
      for (const p of extractRolePaths(html)) {
        roleSet.add(p);
      }

      const responseUrl = (homeResp as { request?: { responseURL?: string } })
        .request?.responseURL;
      if (responseUrl) {
        const p = extractRolePathFromUrl(responseUrl);
        if (p) {
          roleSet.add(p);
        }
      }
    } catch {
      // Non-fatal: keep default '/'
    }
  }

  const rolePaths = roleSet.size > 0 ? Array.from(roleSet) : ['/'];
  return { cookieString, rolePaths, dashboardHtml };
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Authenticate with Wilma and return messages from inbox + archive, sorted newest first.
 */
const BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

export async function fetchWilmaMessages(
  baseUrlOrIcs: string,
  username: string,
  password: string,
): Promise<WilmaMessage[]> {
  const baseUrl = extractBaseUrl(baseUrlOrIcs);
  const { cookieString, rolePaths, dashboardHtml } = await wilmaLogin(
    baseUrl,
    username,
    password,
  );

  // Prefer explicitly configured child role (Niilo), then discovered roles, then root.
  const configuredRole =
    typeof WILMA_ROLE_PATH === 'string' && WILMA_ROLE_PATH.trim() !== ''
      ? WILMA_ROLE_PATH.startsWith('/')
        ? WILMA_ROLE_PATH
        : `/${WILMA_ROLE_PATH}`
      : null;
  const preferredRole = configuredRole
    ? configuredRole.endsWith('/')
      ? configuredRole
      : `${configuredRole}/`
    : null;

  const prefixes = Array.from(
    new Set([
      ...(preferredRole ? [preferredRole] : []),
      ...rolePaths.map(p => (p.endsWith('/') ? p : `${p}/`)),
      '/',
    ]),
  );

  // Wilma espoo: browser URL is /!id/messages (not /messages/list).
  // Try both suffix variants per canonical folder.
  const folders: { suffixes: string[]; folder: string }[] = [
    {
      suffixes: [
        'messages',
        'messages/inbox',
        'messages/list',
        'messages/list/inbox',
        'messages?format=json',
        'messages/list?format=json',
      ],
      folder: 'inbox',
    },
    {
      suffixes: [
        'messages/archive',
        'messages/list/archive',
        'messages/archive?format=json',
        'messages/list/archive?format=json',
      ],
      folder: 'archive',
    },
    {
      suffixes: [
        'messages/outbox',
        'messages/sent',
        'messages/list/outbox',
        'messages/outbox?format=json',
        'messages/sent?format=json',
      ],
      folder: 'outbox',
    },
  ];

  const all: WilmaMessage[] = [];

  // Some tenants render recent/unread messages directly to the dashboard HTML.
  // Parse it first as an additional source.
  if (dashboardHtml && dashboardHtml.trim() !== '') {
    all.push(...parseHtmlMessages(dashboardHtml, 'inbox'));
  }

  // Diagnostics collected per endpoint — shown to user when 0 messages found
  const diagnostics: string[] = [];

  diagnostics.push(`rolePaths: ${prefixes.join(', ')}`);
  diagnostics.push(
    `cookies: [${cookieString
      .split(';')
      .map(c => c.split('=')[0].trim())
      .filter(Boolean)
      .join(', ')}]`,
  );

  // Some Wilma tenants require role activation before message endpoints work.
  const activatedCookieByPrefix = new Map<string, string>();
  for (const prefix of prefixes) {
    if (prefix === '/') {
      activatedCookieByPrefix.set(prefix, cookieString);
      continue;
    }
    try {
      const roleResp = await axios.get(`${baseUrl}${prefix}`, {
        headers: {
          Cookie: cookieString,
          Accept: 'text/html,application/xhtml+xml',
          'Cache-Control': 'no-cache',
          'User-Agent': BROWSER_UA,
          Referer: baseUrl,
        },
        timeout: 12000,
        maxRedirects: 10,
        responseType: 'text',
      });
      const setCookie = roleResp.headers?.['set-cookie'];
      const newCookieNames: string[] = [];
      if (setCookie) {
        const extra = parseCookiesFromHeaders(setCookie);
        newCookieNames.push(
          ...extra
            .split(';')
            .map(c => c.split('=')[0].trim())
            .filter(Boolean),
        );
        activatedCookieByPrefix.set(
          prefix,
          mergeCookieStrings(cookieString, extra),
        );
      } else {
        activatedCookieByPrefix.set(prefix, cookieString);
      }
      const htmlPreview =
        typeof roleResp.data === 'string'
          ? roleResp.data
              .replace(/[\r\n\t]+/g, ' ')
              .trim()
              .slice(0, 100)
          : '';
      diagnostics.push(
        `role activate ${prefix}: ok (new cookies: [${newCookieNames.join(
          ', ',
        )}]) preview:"${htmlPreview}"`,
      );
    } catch {
      activatedCookieByPrefix.set(prefix, cookieString);
      diagnostics.push(`role activate ${prefix}: failed`);
    }
  }

  for (const { suffixes, folder } of folders) {
    let folderResolved = false;

    outerLoop: for (const suffix of suffixes) {
      for (const prefix of prefixes) {
        const path = `${prefix}${suffix}`.replace(/\/\/+/, '/');
        try {
          const activeCookie =
            activatedCookieByPrefix.get(prefix) ?? cookieString;
          const reqHeaders = {
            Cookie: activeCookie,
            Accept: 'application/json, text/html, */*',
            'Cache-Control': 'no-cache',
            'User-Agent': BROWSER_UA,
            'X-Requested-With': 'XMLHttpRequest',
            Referer: `${baseUrl}${prefix}`,
          };
          diagnostics.push(
            `${folder}@${path} req cookies: [${activeCookie
              .split(';')
              .map(c => c.split('=')[0].trim())
              .filter(Boolean)
              .join(', ')}]`,
          );
          const resp = await axios.get<unknown>(`${baseUrl}${path}`, {
            headers: reqHeaders,
            timeout: 15000,
          });
          const raw = resp.data;

          if (isHtmlResponse(raw)) {
            const htmlTitle = extractHtmlTitle(String(raw));
            const htmlPreview = String(raw)
              .replace(/[\r\n\t]+/g, ' ')
              .trim()
              .slice(0, 200);
            const htmlMsgs = parseHtmlMessages(String(raw), folder);
            if (htmlMsgs.length > 0) {
              all.push(...htmlMsgs);
              folderResolved = true;
              diagnostics.push(
                `${folder}@${path}: HTML fallback ${htmlMsgs.length} viestiä`,
              );
              break outerLoop;
            }
            diagnostics.push(
              `${folder}@${path}: HTML vastattu (${resp.status}) title="${htmlTitle}" "${htmlPreview}"`,
            );
            continue;
          }

          // Wilma can serve JSON as text/html -> parse manually from string.
          let data: unknown = raw;
          if (typeof raw === 'string') {
            try {
              data = JSON.parse(raw);
            } catch {
              diagnostics.push(
                `${folder}@${path}: ei-JSON string: "${String(raw).slice(
                  0,
                  80,
                )}"`,
              );
              continue;
            }
          }

          const msgs = parseRawMessages(data, folder);
          all.push(...msgs);
          folderResolved = true;

          const keys =
            data && typeof data === 'object'
              ? Object.keys(data as object).join(', ')
              : typeof data;
          const preview = JSON.stringify(data).slice(0, 120);
          diagnostics.push(
            `${folder}@${path}: ${msgs.length} viestiä (keys: ${keys}) | ${preview}`,
          );
          break outerLoop;
        } catch (e: unknown) {
          const status = (e as { response?: { status?: number } })?.response
            ?.status;
          diagnostics.push(
            `${folder}@${path}: virhe ${status ?? String(e).slice(0, 80)}`,
          );
        }
      }
    }

    if (!folderResolved) {
      diagnostics.push(`${folder}: ei toimivaa endpoint-polkua`);
    }
  }

  if (all.length === 0) {
    // Empty result should not appear as hard failure in UI.
    console.warn(
      `Wilma viestihaku ei palauttanut riveja. Diagnostiikka:\n${diagnostics.join(
        '\n',
      )}`,
    );
    return [];
  }

  // Deduplicate by folder + id because we may fetch from role and root paths.
  const deduped = new Map<string, WilmaMessage>();
  for (const msg of all) {
    deduped.set(`${msg.folder}:${msg.wilmaId}`, msg);
  }
  const unique = Array.from(deduped.values());

  unique.sort((a, b) => {
    if (!a.sentAtDate && !b.sentAtDate) {
      return 0;
    }
    if (!a.sentAtDate) {
      return 1;
    }
    if (!b.sentAtDate) {
      return -1;
    }
    return b.sentAtDate.getTime() - a.sentAtDate.getTime();
  });

  return unique;
}
