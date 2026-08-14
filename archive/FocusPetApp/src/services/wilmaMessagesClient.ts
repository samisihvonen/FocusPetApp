/**
 * Wilma messages client for React Native.
 * Implements the same auth flow as @wilm-ai/wilma-client but using axios
 * with manual cookie handling (compatible with React Native).
 *
 * Login flow:
 *  1. GET /login  → extract hidden form fields (SESSIONID etc.)
 *  2. POST /login → get Wilma2SID cookie
 *  3. GET /messages/list + /messages/list/archive in parallel → merge & sort
 */

import axios from "axios";
import { WILMA_ROLE_PATH } from "../config/secrets";

export type WilmaMessage = {
  wilmaId: number;
  subject: string;
  sentAt: string; // formatted Finnish date string
  sentAtDate: Date | null; // parsed Date for sorting
  senderName: string | null;
  folder: string;
  isRead: boolean;
};

// ──────────────────────────────────────────────────────────────────────────────

function extractBaseUrl(url: string): string {
  try {
    const u = new URL(url.replace(/^webcal:\/\//i, "https://"));
    return `${u.protocol}//${u.host}`;
  } catch {
    if (!url.startsWith("http")) {
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
    .map((h) => h.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookieStrings(baseCookie: string, extraCookie: string): string {
  const merged = new Map<string, string>();

  for (const part of baseCookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) {
      merged.set(k.trim(), v.join("="));
    }
  }
  for (const part of extraCookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) {
      merged.set(k.trim(), v.join("="));
    }
  }

  return Array.from(merged.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function hasLoginPageMarkers(html: string): boolean {
  const normalized = html.toLowerCase();
  return (
    normalized.includes("<title>wilmaan kirjautuminen") ||
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
    if (!name || name === "Login" || name === "Password") {
      continue;
    }
    const type =
      /type=['"]([^'"]+)['"]/i.exec(tag)?.[1]?.toLowerCase() ?? "text";
    if (type === "hidden" || type === "submit") {
      const value = /value=['"]([^'"]*)['"]/i.exec(tag)?.[1] ?? "";
      fields[name] = value;
    }
  }
  return fields;
}

function normalizeMessageList(data: unknown): Array<Record<string, unknown>> {
  const looksLikeMessageArray = (arr: unknown[]): boolean =>
    arr.some((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const obj = item as Record<string, unknown>;
      return (
        obj["id"] !== undefined ||
        obj["Id"] !== undefined ||
        obj["messageId"] !== undefined ||
        obj["MessageId"] !== undefined ||
        obj["subject"] !== undefined ||
        obj["Subject"] !== undefined ||
        obj["topic"] !== undefined ||
        obj["Topic"] !== undefined ||
        obj["title"] !== undefined ||
        obj["Title"] !== undefined
      );
    });

  const searchNested = (
    value: unknown,
    depth: number,
  ): Array<Record<string, unknown>> => {
    if (depth > 4 || !value || typeof value !== "object") {
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
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Try all known Wilma response envelope keys
    const list =
      obj["Messages"] ??
      obj["messages"] ??
      obj["Inbox"] ??
      obj["inbox"] ??
      obj["Items"] ??
      obj["items"] ??
      obj["Data"] ??
      obj["data"];
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
  if (typeof data !== "string") {
    return false;
  }
  const trimmed = data.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
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
    const [, d, mo, y, h = "0", min = "0"] = finnishMatch;
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
  if (!d) return "";
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString("fi-FI", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
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
        item["id"] ??
        item["Id"] ??
        item["messageId"] ??
        item["MessageId"] ??
        item["ThreadId"] ??
        item["threadId"] ??
        item["ConversationId"] ??
        item["conversationId"] ??
        0;
      const subject = String(
        item["Subject"] ?? item["subject"] ?? "(ei aihetta)",
      )
        .replace(/\s+/g, " ")
        .trim();
      const subjectFallback = String(
        item["Topic"] ??
          item["topic"] ??
          item["Title"] ??
          item["title"] ??
          item["Caption"] ??
          item["caption"] ??
          subject,
      )
        .replace(/\s+/g, " ")
        .trim();
      const rawTime = String(
        item["Time"] ??
          item["TimeStamp"] ??
          item["Timestamp"] ??
          item["timestamp"] ??
          item["SentAt"] ??
          item["sentAt"] ??
          item["Date"] ??
          item["date"] ??
          item["Created"] ??
          item["created"] ??
          item["CreatedAt"] ??
          item["createdAt"] ??
          item["Modified"] ??
          item["modified"] ??
          "",
      );
      const sentAtDate = parseWilmaDate(rawTime);
      const rawSender =
        item["SenderName"] ??
        item["Sender"] ??
        item["sender"] ??
        item["From"] ??
        item["FromName"] ??
        item["fromName"] ??
        item["Author"] ??
        item["author"] ??
        null;
      const senderName = rawSender ? String(rawSender).trim() : null;

      const status =
        item["Status"] ??
        item["status"] ??
        item["Read"] ??
        item["read"] ??
        item["IsRead"] ??
        item["isRead"] ??
        item["Unread"] ??
        item["unread"];

      let isRead = true;
      if (status !== undefined) {
        if (typeof status === "boolean") {
          isRead = status;
        } else if (typeof status === "string") {
          const s = status.toLowerCase();
          if (s === "false" || s === "0" || s === "unread") {
            isRead = false;
          } else if (s === "true" || s === "1" || s === "read") {
            isRead = true;
          }
        } else if (typeof status === "number") {
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
          subject: subjectFallback || "(ei aihetta)",
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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHtmlTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? stripHtml(m[1]).trim().slice(0, 100) : "(no title)";
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
        snippet.match(/(\d{1,2}\.\d{1,2}\.\d{4}(?:\s+\d{1,2}:\d{2})?)/)?.[1] ??
        "";
      const sentAtDate = parseWilmaDate(dateText) ?? null;
      out.push({
        wilmaId,
        subject,
        sentAt: sentAtDate ? formatDate(sentAtDate) : "",
        sentAtDate,
        senderName: extractHtmlTitle(html) || null,
        folder,
        isRead: false,
      });
      seen.add(wilmaId);
    }
  }
  return out;
}
