// Server-side page fetch for the "Empresas detectadas" source scanner.
// Doing this fetch from the browser (the original implementation) hit CORS
// on almost every real target site, since browsers block cross-origin
// reads by default and directory sites like Sonos/Loxone/KNX/Control4 have
// no reason to opt in to it. A server-to-server fetch isn't subject to
// CORS at all, so this just moves the exact same robots.txt-respecting
// logic here.

function parseGroupRules(robotsText) {
  const lines = robotsText.split("\n").map((l) => l.split("#")[0].trim());
  const groups = [];
  let current = null;

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

function isAllowed(rules, path) {
  let best = null;
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

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ILeadsBot/1.0; +https://ileads.prestigedistribution.es)" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const url = req.query.url;
  if (!url || Array.isArray(url)) {
    res.status(400).json({ error: "Falta el parametro url" });
    return;
  }

  let origin, path;
  try {
    const parsed = new URL(url);
    origin = parsed.origin;
    path = parsed.pathname + parsed.search;
  } catch {
    res.status(200).json({ status: "unknown", note: "URL no válida." });
    return;
  }

  let robotsText;
  try {
    const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`, 8000);
    if (!robotsRes.ok) {
      // Fall through and scan - no robots.txt (or inaccessible) means
      // allowed by default, matching standard crawler behavior.
      robotsText = "";
    } else {
      robotsText = await robotsRes.text();
    }
  } catch {
    res.status(200).json({
      status: "unknown",
      note: "No se pudo verificar el robots.txt del sitio. Revísalo manualmente antes de escanear.",
    });
    return;
  }

  const rules = parseGroupRules(robotsText);
  const allowed = isAllowed(rules, path);

  if (!allowed) {
    res.status(200).json({ status: "disallowed", note: "robots.txt prohíbe el acceso a esta ruta. No se debe escanear." });
    return;
  }

  try {
    const pageRes = await fetchWithTimeout(url, 8000);
    if (!pageRes.ok) {
      res.status(200).json({ status: "allowed", note: `robots.txt lo permite, pero la página respondió ${pageRes.status}.` });
      return;
    }
    const html = await pageRes.text();
    const text = stripHtml(html);
    res.status(200).json({
      status: "allowed",
      note: "robots.txt lo permite. Contenido leído correctamente.",
      snippet: text.slice(0, 220),
    });
  } catch (e) {
    res.status(200).json({
      status: "allowed",
      note: `robots.txt lo permite, pero no se pudo leer la página (${e instanceof Error ? e.message : "error desconocido"}).`,
    });
  }
}
