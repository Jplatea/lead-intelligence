export type BlockType = "image" | "video" | "text";

export interface MailingBlock {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
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

function renderBlock(block: MailingBlock): string {
  if (!block.content.trim() && block.type !== "text") return "";

  switch (block.type) {
    case "text":
      if (!block.content.trim()) return "";
      return `
        <tr>
          <td style="padding:6px 36px;">
            <p style="margin:0;font-family:'Exo 2',Arial,sans-serif;font-size:15px;line-height:1.7;color:#211f1d;">${textToHtml(block.content)}</p>
          </td>
        </tr>`;

    case "image":
      return `
        <tr>
          <td style="padding:6px 36px;">
            <img src="${escapeHtml(block.content)}" alt="" width="100%" style="display:block;width:100%;max-width:528px;height:auto;border-radius:12px;" />
          </td>
        </tr>`;

    case "video": {
      if (!isRemoteUrl(block.content)) {
        return `
        <tr>
          <td style="padding:6px 36px;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#8a8378;">
              (Un vídeo subido como archivo no se incluye aquí — los clientes de correo no lo reproducen. Sube el vídeo a un servicio como YouTube o Vimeo y pega esa URL para que aparezca como botón "Ver vídeo".)
            </p>
          </td>
        </tr>`;
      }
      return `
        <tr>
          <td style="padding:14px 36px;text-align:center;">
            <a href="${escapeHtml(block.content)}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#2a9678;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-weight:600;font-size:14px;">&#9654; Ver v&iacute;deo</a>
          </td>
        </tr>`;
    }
  }
}

export interface EmailMeta {
  eyebrow?: string;
  heading?: string;
}

// Builds a self-contained, table-based HTML document (the layout approach
// email clients actually render consistently — flexbox/absolute positioning
// from the canvas editor gets flattened into a single centered column,
// ordered top-to-bottom by each block's y position).
export function buildMarketingEmailHtml(blocks: MailingBlock[], meta: EmailMeta = {}): string {
  const ordered = [...blocks].sort((a, b) => a.y - b.y);
  const rows = ordered.map(renderBlock).filter(Boolean).join("");
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
            <td style="padding:32px 36px 24px;background:linear-gradient(135deg,#a8dfcf,#a79bcb);">
              <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#211f1d;opacity:0.65;">${eyebrow}</p>
              <h1 style="margin:0;font-family:Arial,sans-serif;font-size:24px;line-height:1.3;color:#211f1d;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows || `<tr><td style="padding:6px 36px;"><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#8a8378;">Añade bloques en la plantilla para ver el contenido aquí.</p></td></tr>`}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px;background-color:#faf6f0;border-top:1px solid rgba(33,31,29,0.08);">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:#8a8378;">
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
