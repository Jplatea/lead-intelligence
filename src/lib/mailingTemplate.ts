export type SectionType = "text" | "image" | "video" | "button" | "divider" | "html" | "row";
export type TextAlign = "left" | "center" | "right";
export type TextStyle = "heading" | "body";

// No x/y/width/height: the template's layout (order, and which fields sit
// side by side as a "row") is fixed by its structure, not by dragging boxes
// around a canvas. Each section is rendered in place, in order, and every
// field inside it is directly editable — there is no separate positioned
// "card" standing in for the real content anymore.
export interface MailingSection {
  id: string;
  type: SectionType;
  content: string;
  fontFamily?: string;
  textAlign?: TextAlign;
  // Text sections only: "heading" renders larger/bold in the brand accent
  // color, so a section title reads as a title instead of just another
  // paragraph.
  textStyle?: TextStyle;
  textColor?: string;
  // An optional section background — lets a block sit on its own colored
  // panel (like the gold promo band or dark header in the reference
  // template) instead of every block being plain white.
  bgColor?: string;
  // Button sections only.
  url?: string;
  // Button/divider sections: the accent color (button fill / divider rule).
  color?: string;
  // Row sections only: exactly two leaf sections rendered side by side
  // (e.g. an image next to its description), wrapped in one card.
  columns?: MailingSection[];
}

// A clean, professional sans-serif that reads clearly different from plain
// Arial without depending on a webfont fetch — email clients (and even our
// own preview) are inconsistent about loading @import/link web fonts, so
// this leans on each OS's own good system font instead: Segoe UI on
// Windows, Helvetica Neue on macOS/iOS, falling back to Arial.
const FONT_STACK = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// Only classic "web-safe" font families — the ones actually pre-installed
// across Windows/macOS/mail clients — since a text section's font choice
// has to survive being rendered by whatever the recipient's mail client is,
// with no webfont loading available there at all.
export const TEXT_FONT_OPTIONS: { value: string; label: string; stack: string }[] = [
  { value: "system", label: "Sistema (recomendado)", stack: FONT_STACK },
  { value: "georgia", label: "Georgia", stack: "Georgia, 'Times New Roman', serif" },
  { value: "times", label: "Times New Roman", stack: "'Times New Roman', Times, serif" },
  { value: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { value: "trebuchet", label: "Trebuchet MS", stack: "'Trebuchet MS', sans-serif" },
  { value: "courier", label: "Courier New", stack: "'Courier New', Courier, monospace" },
];

export function textFontStack(value: string | undefined): string {
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

function renderTextHtml(section: MailingSection): string {
  if (!section.content.trim()) return "";
  const stack = textFontStack(section.fontFamily);
  const align = section.textAlign ?? "left";
  const isHeading = section.textStyle === "heading";
  const color = section.textColor || (isHeading ? "#bea05a" : "#211f1d");
  const html = `<p style="margin:0;font-family:${stack};font-size:${isHeading ? "23px" : "15px"};font-weight:${isHeading ? "700" : "400"};line-height:${isHeading ? "1.3" : "1.7"};color:${color};text-align:${align};">${textToHtml(section.content)}</p>`;
  // An optional section background — wraps the text in its own colored
  // panel so it reads as a distinct band (gold promo strip, dark header)
  // instead of every section sitting on plain white.
  return section.bgColor
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${escapeHtml(section.bgColor)};border-radius:12px;"><tr><td style="padding:20px 24px;">${html}</td></tr></table>`
    : html;
}

// An empty image slot still renders as a placeholder box (not nothing) so
// a row's two-column layout — image beside its description — stays intact
// and legible before the real photo is uploaded, instead of collapsing
// into an unexplained gap.
function renderImagePlaceholder(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed rgba(33,31,29,0.25);border-radius:12px;background-color:#f3efe9;">
      <tr>
        <td align="center" style="padding:52px 12px;">
          <p style="margin:0;font-family:${FONT_STACK};font-size:12px;color:#a39c92;">Imagen pendiente</p>
        </td>
      </tr>
    </table>`;
}

function renderImageHtml(section: MailingSection): string {
  return section.content.trim()
    ? `<img src="${escapeHtml(section.content)}" alt="" width="100%" style="display:block;width:100%;height:auto;border-radius:12px;border:1px solid rgba(33,31,29,0.1);" />`
    : renderImagePlaceholder();
}

function renderVideoHtml(section: MailingSection): string {
  if (!section.content.trim()) return "";
  if (!isRemoteUrl(section.content)) {
    return `<p style="margin:0;font-family:${FONT_STACK};font-size:12px;color:#8a8378;">(Un v&iacute;deo subido como archivo no se incluye aqu&iacute; — los clientes de correo no lo reproducen. Sube el v&iacute;deo a un servicio como YouTube o Vimeo y pega esa URL para que aparezca como bot&oacute;n "Ver v&iacute;deo".)</p>`;
  }
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(33,31,29,0.1);border-radius:12px;background-color:#faf6f0;">
      <tr>
        <td align="center" style="padding:26px 12px;">
          <a href="${escapeHtml(section.content)}" style="display:inline-block;padding:14px 32px;border-radius:999px;background-color:#2a9678;color:#ffffff;text-decoration:none;font-family:${FONT_STACK};font-weight:600;font-size:14px;">&#9654; Ver v&iacute;deo</a>
        </td>
      </tr>
    </table>`;
}

// A button section renders as a bulletproof table-based CTA (the pattern
// email clients actually render buttons with, since plain <button>/<a
// style="background"> collapses inconsistently in Outlook).
function renderButtonHtml(section: MailingSection): string {
  if (!section.content.trim()) return "";
  const bg = section.color || "#bea05a";
  const href = (section.url ?? "").trim() || "#";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
      <tr>
        <td style="border-radius:6px;background-color:${escapeHtml(bg)};text-align:center;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 30px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(section.content)}</a>
        </td>
      </tr>
    </table>`;
}

function renderDividerHtml(section: MailingSection): string {
  const color = section.color || "#1a1a1a";
  return `<div style="border-top:2px solid ${escapeHtml(color)};line-height:0;font-size:0;">&nbsp;</div>`;
}

// Renders a single leaf section (never "row" — a row's columns are each
// rendered through this function individually).
function renderLeafHtml(section: MailingSection): string {
  switch (section.type) {
    case "text":
      return renderTextHtml(section);
    case "image":
      return renderImageHtml(section);
    case "video":
      return renderVideoHtml(section);
    case "button":
      return renderButtonHtml(section);
    case "divider":
      return renderDividerHtml(section);
    case "html":
      return section.content;
    case "row":
      return "";
  }
}

// Wraps one top-level section in its table row. Plain sections get simple
// padding; a "row" section's two columns are wrapped as one card — a
// bordered, rounded, shadowed panel — rather than floating with no visual
// container.
function renderSectionRow(section: MailingSection): string {
  if (section.type === "row") {
    const columns = section.columns ?? [];
    const contents = columns.map(renderLeafHtml);
    if (contents.every((c) => !c)) return "";
    const cells = columns
      .map((_, i) => (contents[i] ? `<td width="50%" valign="middle" style="padding:14px;">${contents[i]}</td>` : ""))
      .filter(Boolean)
      .join("");
    return `
      <tr>
        <td style="padding:10px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid rgba(33,31,29,0.08);border-radius:16px;box-shadow:0 6px 16px rgba(33,31,29,0.06);">
            <tr>${cells}</tr>
          </table>
        </td>
      </tr>`;
  }

  const content = renderLeafHtml(section);
  if (!content) return "";
  // A raw "html" section is typically a whole pasted-in email fragment that
  // already manages its own margins/background — wrapping it in the usual
  // side padding would just nest it inside padding it doesn't need.
  if (section.type === "html") {
    return `<tr><td style="padding:0;">${content}</td></tr>`;
  }
  return `<tr><td style="padding:8px 36px;">${content}</td></tr>`;
}

export interface EmailMeta {
  eyebrow?: string;
  heading?: string;
}

// Builds a self-contained, table-based HTML document (the layout approach
// email clients actually render consistently — a flattened grid of rows,
// each row holding one section, or a two-column pair, in the template's
// fixed order).
export function buildMarketingEmailHtml(sections: MailingSection[], meta: EmailMeta = {}): string {
  const rows = sections.map(renderSectionRow).filter(Boolean).join("");
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
                ${rows || `<tr><td style="padding:6px 36px;"><p style="margin:0;font-family:${FONT_STACK};font-size:13px;color:#8a8378;">Añade secciones a la plantilla para ver el contenido aquí.</p></td></tr>`}
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
