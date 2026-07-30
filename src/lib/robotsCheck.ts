import type { RobotsStatus } from "../data/sources";

interface RobotsRule {
  path: string;
  allow: boolean;
}

function parseGroupRules(robotsText: string): RobotsRule[] {
  const lines = robotsText.split("\n").map((l) => l.split("#")[0].trim());
  const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;

  for (const line of lines) {
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" && current) {
      if (value) current.rules.push({ path: value, allow: false });
    } else if (key === "allow" && current) {
      if (value) current.rules.push({ path: value, allow: true });
    }
  }

  const wildcard = groups.find((g) => g.agents.includes("*"));
  return wildcard?.rules ?? [];
}

function isAllowed(rules: RobotsRule[], path: string): boolean {
  let best: RobotsRule | null = null;
  for (const rule of rules) {
    const pattern = rule.path.replace(/\*/g, "");
    if (pattern && path.startsWith(pattern)) {
      if (!best || pattern.length > best.path.replace(/\*/g, "").length) {
        best = rule;
      }
    }
  }
  return best ? best.allow : true;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface RobotsCheckResult {
  status: RobotsStatus;
  note: string;
  snippet?: string;
}

export async function checkUrlAndScan(url: string): Promise<RobotsCheckResult> {
  let origin: string;
  let path: string;
  try {
    const parsed = new URL(url);
    origin = parsed.origin;
    path = parsed.pathname + parsed.search;
  } catch {
    return { status: "unknown", note: "URL no válida." };
  }

  let robotsText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${origin}/robots.txt`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { status: "allowed", note: "Sin robots.txt (o inaccesible) — se asume permitido por defecto." };
    }
    robotsText = await res.text();
  } catch {
    return {
      status: "unknown",
      note: "No se pudo verificar el robots.txt desde el navegador (bloqueado por CORS). Revísalo manualmente antes de escanear.",
    };
  }

  const rules = parseGroupRules(robotsText);
  const allowed = isAllowed(rules, path);

  if (!allowed) {
    return { status: "disallowed", note: "robots.txt prohíbe el acceso a esta ruta. No se debe escanear." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { status: "allowed", note: `robots.txt lo permite, pero la página respondió ${res.status}.` };
    }
    const html = await res.text();
    const text = stripHtml(html);
    return {
      status: "allowed",
      note: "robots.txt lo permite. Contenido leído correctamente.",
      snippet: text.slice(0, 220),
    };
  } catch {
    return {
      status: "allowed",
      note: "robots.txt lo permite, pero el contenido no se pudo leer desde el navegador (CORS). Ábrelo manualmente para revisar.",
    };
  }
}
