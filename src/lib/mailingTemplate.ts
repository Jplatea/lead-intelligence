export type BlockType = "image" | "video" | "text";
export type TextAlign = "left" | "center" | "right";

export interface MailingBlock {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontFamily?: string;
  textAlign?: TextAlign;
}

// A clean, professional sans-serif that reads clearly different from plain
// Arial without depending on a webfont fetch — email clients (and even our
// own preview iframe) are inconsistent about loading @import/link web
// fonts, so this leans on each OS's own good system font instead: Segoe UI
// on Windows, Helvetica Neue on macOS/iOS, falling back to Arial.
const FONT_STACK = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// Only classic "web-safe" font families — the ones actually pre-installed
// across Windows/macOS/mail clients — since a text block's font choice has
// to survive being rendered by whatever the recipient's mail client is,
// with no webfont loading available there at all.
export const TEXT_FONT_OPTIONS: { value: string; label: string; stack: string }[] = [
  { value: "system", label: "Sistema (recomendado)", stack: FONT_STACK },
  { value: "georgia", label: "Georgia", stack: "Georgia, 'Times New Roman', serif" },
  { value: "times", label: "Times New Roman", stack: "'Times New Roman', Times, serif" },
  { value: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { value: "trebuchet", label: "Trebuchet MS", stack: "'Trebuchet MS', sans-serif" },
  { value: "courier", label: "Courier New", stack: "'Courier New', Courier, monospace" },
];

function textFontStack(value: string | undefined): string {
  return TEXT_FONT_OPTIONS.find((f) => f.value === value)?.stack ?? FONT_STACK;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Paragraph breaks survive as <br> pairs — email clients ignore CSS
// white-space, so newlines have to be turned into real markup.
function textToHtml(text: string): string {
  return escapeHtml(text).split("\n").join("<br>");
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// Groups blocks into visual "rows" by vertical overlap — two blocks placed
// side by side on the canvas (their y-ranges mostly overlapping) become
// table cells in the same row, instead of every block just stacking in the
// order it was dropped. This is what makes the exported HTML honor the
// alignment actually chosen in the editor.
function groupIntoRows(blocks: MailingBlock[]): MailingBlock[][] {
  const sorted = [...blocks].sort((a, b) => a.y - b.y);
  const rows: MailingBlock[][] = [];

  for (const block of sorted) {
    const last = rows[rows.length - 1];
    if (last) {
      const rowTop = Math.min(...last.map((b) => b.y));
      const rowBottom = Math.max(...last.map((b) => b.y + b.height));
      const overlap = Math.min(rowBottom, block.y + block.height) - Math.max(rowTop, block.y);
      const shorterHeight = Math.min(block.height, rowBottom - rowTop);
      if (overlap > shorterHeight * 0.4) {
        last.push(block);
        continue;
      }
    }
    rows.push([block]);
  }

  rows.forEach((row) => row.sort((a, b) => a.x - b.x));
  return rows;
}

function renderBlockContent(block: MailingBlock): string {
  if (!block.content.trim()) return "";

  switch (block.type) {
    case "text": {
      const stack = textFontStack(block.fontFamily);
      const align = block.textAlign ?? "left";
      return `<p style="margin:0;font-family:${stack};font-size:15px;line-height:1.7;color:#211f1d;text-align:${align};">${textToHtml(block.content)}</p>`;
    }

    case "image":
      return `<img src="${escapeHtml(block.content)}" alt="" width="100%" style="display:block;width:100%;height:auto;border-radius:12px;border:1px solid rgba(33,31,29,0.1);" />`;

    case "video": {
      if (!isRemoteUrl(block.content)) {
        return `<p style="margin:0;font-family:${FONT_STACK};font-size:12px;color:#8a8378;">(Un v&iacute;deo subido como archivo no se incluye aqu&iacute; — los clientes de correo no lo reproducen. Sube el v&iacute;deo a un servicio como YouTube o Vimeo y pega esa URL para que aparezca como bot&oacute;n "Ver v&iacute;deo".)</p>`;
      }
      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(33,31,29,0.1);border-radius:12px;background-color:#faf6f0;">
          <tr>
            <td align="center" style="padding:26px 12px;">
              <a href="${escapeHtml(block.content)}" style="display:inline-block;padding:14px 32px;border-radius:999px;background-color:#2a9678;color:#ffffff;text-decoration:none;font-family:${FONT_STACK};font-weight:600;font-size:14px;">&#9654; Ver v&iacute;deo</a>
            </td>
          </tr>
        </table>`;
    }
  }
}

function renderRow(row: MailingBlock[]): string {
  const contents = row.map(renderBlockContent);
  if (contents.every((c) => !c)) return "";

  if (row.length === 1) {
    return `<tr><td style="padding:8px 36px;">${contents[0]}</td></tr>`;
  }

  const totalWidth = row.reduce((sum, b) => sum + b.width, 0);
  const cells = row
    .map((b, i) => {
      if (!contents[i]) return "";
      const pct = Math.max(15, Math.round((b.width / totalWidth) * 100));
      return `<td width="${pct}%" valign="top" style="padding:8px 8px;">${contents[i]}</td>`;
    })
    .filter(Boolean)
    .join("");

  return `<tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr>`;
}

export interface EmailMeta {
  eyebrow?: string;
  heading?: string;
}

// Builds a self-contained, table-based HTML document (the layout approach
// email clients actually render consistently — a flattened grid of rows,
// each row holding one or more blocks side by side exactly as arranged on
// the canvas, ordered top-to-bottom by position).
export function buildMarketingEmailHtml(blocks: MailingBlock[], meta: EmailMeta = {}): string {
  const rows = groupIntoRows(blocks).map(renderRow).filter(Boolean).join("");
  const eyebrow = escapeHtml(meta.eyebrow ?? "Prestige Ibérica");
  const heading = escapeHtml(meta.heading ?? "Novedades para tu negocio");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#e6dcd2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e6dcd2;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 45px rgba(33,31,29,0.14);">
          <tr>
            <td align="center" style="padding:26px 36px 20px;background-color:#ffffff;border-bottom:1px solid rgba(33,31,29,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="padding-right:8px;">
                    <img
                      src="https://ileads.prestigedistribution.es/prestige-logo-black.png"
                      alt=""
                      width="26"
                      height="32"
                      style="display:block;width:26px;height:32px;"
                    />
                  </td>
                  <td style="font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:0.06em;color:#161514;white-space:nowrap;">
                    PRESTIGE<span style="font-weight:400;opacity:0.65;">&nbsp;DISTRIBUTION</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 24px;background:linear-gradient(135deg,#a8dfcf,#a79bcb);">
              <p style="margin:0 0 6px;font-family:${FONT_STACK};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#211f1d;opacity:0.65;">${eyebrow}</p>
              <h1 style="margin:0;font-family:${FONT_STACK};font-weight:700;font-size:24px;line-height:1.3;color:#211f1d;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows || `<tr><td style="padding:6px 36px;"><p style="margin:0;font-family:${FONT_STACK};font-size:13px;color:#8a8378;">Añade bloques en la plantilla para ver el contenido aquí.</p></td></tr>`}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px;background-color:#faf6f0;border-top:1px solid rgba(33,31,29,0.08);">
              <p style="margin:0;font-family:${FONT_STACK};font-size:11px;line-height:1.6;color:#8a8378;">
                Recibes este correo porque eres cliente o colaborador de Prestige Ib&eacute;rica Distribution.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// A real .eml file (RFC 5322 message) with an HTML body — unlike a mailto:
// link, this can actually carry the rendered template inside it. Opening
// the downloaded file hands it to the user's default mail client already
// containing the recipients, subject, and formatted design; X-Unsent tells
// Outlook (Windows) specifically to treat it as an editable draft rather
// than a received message.
export function buildEmlFile(html: string, subject: string, bcc: string[]): string {
  const headers = [
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    ...(bcc.length > 0 ? [`Bcc: ${bcc.join(", ")}`] : []),
    "X-Unsent: 1",
    "Content-Type: text/html; charset=UTF-8",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${html}`;
}
