import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Code2,
  Copy,
  Download,
  Heading2,
  Image as ImageIcon,
  Mail,
  Minus,
  MousePointerClick,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import type { MailingContact } from "../types";
import {
  buildEmlFile,
  buildMarketingEmailHtml,
  TEXT_FONT_OPTIONS,
  textFontStack,
  type SectionType,
  type MailingSection as Section,
  type TextAlign,
} from "../lib/mailingTemplate";

interface Props {
  contacts: MailingContact[];
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function newSection(type: SectionType, index: number): Section {
  const base = { id: `${type}-${Date.now()}-${index}`, type, content: "" };
  switch (type) {
    case "text":
      return { ...base, fontFamily: "system", textAlign: "left", textStyle: "body" };
    case "button":
      return { ...base, content: "Ver más", url: "", color: "#bea05a" };
    case "divider":
      return { ...base, color: "#1a1a1a" };
    default:
      return base;
  }
}

// The starting layout the template loads with. This mirrors the real
// Prestige Ibérica / Le Groupe Prestige newsletter (Artcoustic / TruAudio /
// Screen Innovations, Sept. 2025 Mailchimp send) — real copy, real product
// photos, and real CTA links, structured as an ordered list of sections
// instead of freely positioned cards. There is no canvas to arrange: the
// layout (what's full-width, what's a two-column pair) is fixed by the
// template, and every field inside it is edited directly in place.
function buildDefaultSections(): Section[] {
  const centered = { fontFamily: "system" as const, textAlign: "center" as const };
  const left = { fontFamily: "system" as const, textAlign: "left" as const };
  const headingCentered = { ...centered, textStyle: "heading" as const };
  const headingLeft = { ...left, textStyle: "heading" as const };
  const gold = "#bea05a";
  const button = (id: string, content: string, url: string): Section => ({
    id,
    type: "button",
    content,
    url,
    color: gold,
  });
  const divider = (id: string): Section => ({ id, type: "divider", content: "", color: "#1a1a1a" });
  const row = (id: string, colA: Section, colB: Section): Section => ({
    id,
    type: "row",
    content: "",
    columns: [colA, colB],
  });

  return [
    { id: "tpl-hero-title", type: "text", content: "Su equipo audiovisual para la nueva temporada", ...headingCentered },
    {
      id: "tpl-hero-subtitle",
      type: "text",
      content: "Nos complace añadir Artcoustic a nuestra oferta. ¿Conoce nuestras marcas TruAudio y Screen Innovations?",
      ...centered,
    },
    {
      id: "tpl-hero-img",
      type: "image",
      content: "https://mcusercontent.com/2e33aab684ca6356e4ea79b50/images/96122623-d53a-5fe2-4367-f7fb92f64574.jpg",
    },
    divider("tpl-div-1"),

    { id: "tpl-artcoustic-heading", type: "text", content: "1| Artcoustic, nueva marca de Prestige", ...headingLeft },
    {
      id: "tpl-artcoustic-body",
      type: "text",
      content:
        "Estamos muy contentos de iniciar una nueva colaboración con la marca de audio Artcoustic. El fabricante danés cuenta con una amplia gama de productos, principalmente para montaje en pared, con tecnología acústica avanzada.\n\nArtcoustic combina el audio de alta fidelidad y la integración arquitectónica con altavoces finos, gamas específicas para cada uso y modelos personalizables. Confíe en la gama Spitfire para obtener potentes altavoces de cine o en la serie SL para sistemas multiroom. Artcoustic también hace énfasis en la integración estética con colores personalizados.",
      ...left,
    },
    button("tpl-artcoustic-cta", "Descubre Artcoustic en su página web", "https://www.artcoustic.com/"),
    row(
      "tpl-artcoustic-row",
      {
        id: "tpl-artcoustic-img",
        type: "image",
        content: "https://mcusercontent.com/2e33aab684ca6356e4ea79b50/images/78917137-b437-a8a4-a9f9-24ab0a976969.jpg",
      },
      {
        id: "tpl-artcoustic-products",
        type: "text",
        content: "Los productos Artcoustic\n\n» Ver altavoces multiroom\n» Ver altavoces de cinema\n» Ver barras de sonido",
        ...left,
      }
    ),
    divider("tpl-div-2"),

    { id: "tpl-truaudio-heading", type: "text", content: "2| TruAudio", ...headingLeft },
    {
      id: "tpl-truaudio-body",
      type: "text",
      content:
        "Especializada en altavoces empotrables multiroom, TruAudio ofrece a los instaladores productos diseñados para combinar rendimiento sonoro, fiabilidad y discreción estética. Gracias a una amplia gama pensada para satisfacer las necesidades tanto residenciales como comerciales, TruAudio facilita la creación de experiencias sonoras inmersivas y duraderas. Innovadora y orientada a los profesionales, la marca ofrece soluciones técnicas adaptadas a todos los entornos, con una amplia selección de altavoces empotrables, pero también una gama muy completa para exteriores, altavoces suspendidos o barras de sonido personalizadas.",
      ...left,
    },
    button("tpl-truaudio-cta", "Descubre TruAudio en su página web", "https://www.truaudio.com/"),
    row(
      "tpl-phantom-row",
      {
        id: "tpl-phantom-text",
        type: "text",
        content:
          "Zoom sobre Phantom y Shadow\n\nLos modelos empotrados en techo se encuentran entre nuestros productos TruAudio más vendidos, y tienen un precio atractivo:\n\n• Distribución clara del sonido en espacios amplios\n• Integración discreta sin marco\n• Resistencia a entornos húmedos\n• 8,5”, 6,5” o 4”",
        ...left,
      },
      {
        id: "tpl-phantom-img",
        type: "image",
        content: "https://mcusercontent.com/2e33aab684ca6356e4ea79b50/images/d57795ae-252a-3568-1dbc-5252f02e30af.jpg",
      }
    ),
    divider("tpl-div-3"),

    {
      id: "tpl-screen-heading",
      type: "text",
      content: "Screen Innovations: pantallas de proyección de alta gama en el punto de mira",
      ...headingCentered,
    },
    {
      id: "tpl-screen-body",
      type: "text",
      content:
        "Especializada en pantallas de proyección y persianas motorizadas, Screen Innovations combina tecnología, diseño y rendimiento. Sus pantallas (como Black Diamond® y Maestro 2™) ofrecen una calidad de imagen excepcional, incluso con luz ambiental. Las elegantes persianas conectadas se integran a la perfección tanto en espacios interiores como exteriores. Aproveche este equipo de calidad profesional para sus instalaciones de alta gama.",
      ...centered,
    },
    button("tpl-screen-cta", "Descubra Screen Innovations en su web", "https://www.screeninnovations.com/screen/fixed/"),
    row(
      "tpl-screens-row",
      {
        id: "tpl-screens-img",
        type: "image",
        content: "https://mcusercontent.com/2e33aab684ca6356e4ea79b50/images/5298add2-eb83-8051-116f-6d0f9826a2af.jpg",
      },
      {
        id: "tpl-screens-text",
        type: "text",
        content:
          "Pantallas a medida\n\nSI le permite crear la pantalla fija, motorizada u oculta que desee gracias a su configurador en línea: dimensiones, encofrado, color, descenso motorizado, relación de aspecto, montaje, especificidad de la tela... Hay disponibles una quincena de telas para adaptarse a numerosos entornos de proyección, como la Black Diamond, que rechaza la luz ambiental, o la Maestro 2, acústicamente transparente.",
        ...left,
      }
    ),
    row(
      "tpl-blinds-row",
      {
        id: "tpl-blinds-text",
        type: "text",
        content:
          "Amplia selección de persianas\n\nSe le ofrecen diferentes tecnologías de persianas, algunas de ellas patentadas. El modo de apertura, el color, la motorización y los tejidos se combinan según sus instrucciones, para una integración perfecta en el diseño del espacio. En cuanto a la integración técnica, estas persianas se integran fácilmente en una instalación conectada, incluyendo un control nativo mediante Control4.",
        ...left,
      },
      {
        id: "tpl-blinds-img",
        type: "image",
        content: "https://mcusercontent.com/2e33aab684ca6356e4ea79b50/images/b7061841-c302-f51b-e2dc-93bc9d427abc.jpg",
      }
    ),
    divider("tpl-div-4"),

    { id: "tpl-youtube-heading", type: "text", content: "Nuestros tutoriales en YouTube", ...headingCentered },
    {
      id: "tpl-youtube-body",
      type: "text",
      content: "¿Necesita consejos para sus instalaciones? Nuestros vídeos responden a las preguntas más frecuentes.\n\nBúsquelos por temas en nuestra página:",
      ...centered,
    },
    button("tpl-youtube-cta", "Canal Le Groupe Prestige en YouTube", "https://www.youtube.com/@legroupeprestige/videos"),
    { id: "tpl-youtube-video", type: "video", content: "https://www.youtube.com/watch?v=zc6UXZ-XUxU" },
    { id: "tpl-youtube-caption", type: "text", content: "Aquí está la más reciente, de la semana pasada.", ...centered },
    divider("tpl-div-5"),

    { id: "tpl-control4-heading", type: "text", content: "Formación Control4", ...headingCentered },
    {
      id: "tpl-control4-body",
      type: "text",
      content:
        "Las formaciones de Control4 le permiten convertirse en integrador certificado de la marca, requisito necesario para instalar sus productos. Se imparten en nuestras instalaciones de Murcia para poner en práctica todo lo que aprende.\n\nSi está interesado, póngase en contacto con Víctor.",
      ...centered,
    },
    button("tpl-control4-cta", "+34 6 86 05 72 05", "tel:+34686057205"),
    {
      id: "tpl-control4-img",
      type: "image",
      content: "https://mcusercontent.com/2e33aab684ca6356e4ea79b50/images/8e92a952-68d2-1917-1b31-83fbe47f9985.png",
    },
  ];
}

const TEMPLATE_STORAGE_KEY = "lead-intelligence:mailing-template";

// The template is meant to be a base that keeps getting refined over time,
// not something that resets every visit — so it persists to localStorage
// the same way companies/mailingContacts do, and only falls back to the
// built-in starter layout the very first time there's nothing saved yet.
function loadSections(): Section[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to the default template
  }
  return buildDefaultSections();
}

// Recursively finds a section by id — checking top-level sections and, for
// "row" sections, their two columns — and applies an update. There is no
// deeper nesting than one level (a row's columns are always leaves).
function mapSections(sections: Section[], id: string, fn: (s: Section) => Section): Section[] {
  return sections.map((s) => {
    if (s.id === id) return fn(s);
    if (s.type === "row" && s.columns) {
      return { ...s, columns: s.columns.map((c) => (c.id === id ? fn(c) : c)) };
    }
    return s;
  });
}

// Removing a row's column just shrinks that row; a row left with no
// columns disappears entirely rather than rendering an empty card.
function removeFromSections(sections: Section[], id: string): Section[] {
  return sections
    .filter((s) => s.id !== id)
    .map((s) => (s.type === "row" && s.columns ? { ...s, columns: s.columns.filter((c) => c.id !== id) } : s))
    .filter((s) => s.type !== "row" || (s.columns && s.columns.length > 0));
}

interface AddButtonDef {
  type: SectionType;
  label: string;
  icon: typeof ImageIcon;
  text: string;
}

const ADD_BUTTONS: AddButtonDef[] = [
  { type: "text", label: "Texto", icon: Type, text: "text-[#6a56a0]" },
  { type: "image", label: "Imagen", icon: ImageIcon, text: "text-[#2a9678]" },
  { type: "video", label: "Vídeo", icon: Video, text: "text-[#a3672c]" },
  { type: "button", label: "Botón", icon: MousePointerClick, text: "text-[#8a7238]" },
  { type: "divider", label: "Separador", icon: Minus, text: "text-neutral-600" },
  { type: "html", label: "HTML", icon: Code2, text: "text-[#5a6bc0]" },
];

// A textarea that grows to fit its content — so a text field reads as a
// natural piece of the template's flow (no fixed box clipping the copy),
// not a fixed-size input.
function AutoTextarea({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      style={style}
      className="w-full resize-none outline-none border border-transparent hover:border-black/10 focus:border-[#a8dfcf] rounded-lg transition-colors placeholder:text-neutral-400"
    />
  );
}

export function MailingPage({ contacts }: Props) {
  const [sections, setSections] = useState<Section[]>(loadSections);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(sections));
  }, [sections]);

  const updateSection = (id: string, patch: Partial<Section>) =>
    setSections((prev) => mapSections(prev, id, (s) => ({ ...s, ...patch })));

  const removeSection = (id: string) => setSections((prev) => removeFromSections(prev, id));

  const addSection = (type: SectionType) => setSections((prev) => [...prev, newSection(type, prev.length)]);

  const handleFile = async (section: Section, file: File | undefined) => {
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    updateSection(section.id, { content: dataUrl });
  };

  const submitUrl = (section: Section) => {
    const val = (urlDrafts[section.id] ?? "").trim();
    if (!val) return;
    updateSection(section.id, { content: val });
    setUrlDrafts((prev) => ({ ...prev, [section.id]: "" }));
  };

  const recipients = Array.from(new Set(contacts.map((c) => c.email.trim()).filter(Boolean)));

  const downloadHtml = () => {
    const html = buildMarketingEmailHtml(sections);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mailing-prestige-iberica.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(buildMarketingEmailHtml(sections)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // A real .eml file can carry an HTML body directly (mailto: links can't —
  // that's a text/plain-only browser/OS limitation) — downloading one and
  // opening it hands the user's mail client a draft that already has the
  // recipients, subject, and formatted template inside it, no paste step
  // needed.
  const downloadEmlDraft = () => {
    const html = buildMarketingEmailHtml(sections);
    const eml = buildEmlFile(html, "Novedades de Prestige Ibérica", recipients);
    const blob = new Blob([eml], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "borrador-mailing-prestige.eml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTextField = (section: Section) => {
    const isHeading = (section.textStyle ?? "body") === "heading";
    return (
      <div className="w-full group/text">
        <div className="hidden group-focus-within/text:flex flex-wrap items-center gap-1.5 mb-1">
          <select
            value={section.fontFamily ?? "system"}
            onChange={(e) => updateSection(section.id, { fontFamily: e.target.value })}
            className="bg-black/[0.03] border border-black/10 rounded px-1 py-0.5 text-[10px] text-neutral-600 outline-none cursor-pointer"
          >
            {TEXT_FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-0.5">
            {(
              [
                { value: "left", icon: AlignLeft },
                { value: "center", icon: AlignCenter },
                { value: "right", icon: AlignRight },
              ] as { value: TextAlign; icon: typeof AlignLeft }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSection(section.id, { textAlign: opt.value })}
                className={`p-1 rounded ${
                  (section.textAlign ?? "left") === opt.value
                    ? "bg-[#a79bcb]/30 text-[#6a56a0]"
                    : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                <opt.icon size={11} />
              </button>
            ))}
          </div>
          <button
            type="button"
            title="Alternar título / texto normal"
            onClick={() => updateSection(section.id, { textStyle: isHeading ? "body" : "heading" })}
            className={`p-1 rounded ${
              isHeading ? "bg-[#a79bcb]/30 text-[#6a56a0]" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <Heading2 size={12} />
          </button>
          <label className="flex items-center gap-1" title="Color del texto">
            <span className="text-[9px] text-neutral-400">A</span>
            <input
              type="color"
              value={section.textColor ?? (isHeading ? "#bea05a" : "#211f1d")}
              onChange={(e) => updateSection(section.id, { textColor: e.target.value })}
              className="w-4 h-4 rounded cursor-pointer border border-black/10 p-0"
            />
          </label>
          <label className="flex items-center gap-1" title="Color de fondo de la sección">
            <span className="text-[9px] text-neutral-400">Fondo</span>
            <input
              type="color"
              value={section.bgColor ?? "#ffffff"}
              onChange={(e) => updateSection(section.id, { bgColor: e.target.value })}
              className="w-4 h-4 rounded cursor-pointer border border-black/10 p-0"
            />
          </label>
          {section.bgColor && (
            <button
              type="button"
              title="Quitar color de fondo"
              onClick={() => updateSection(section.id, { bgColor: undefined })}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X size={10} />
            </button>
          )}
        </div>
        <AutoTextarea
          value={section.content}
          onChange={(v) => updateSection(section.id, { content: v })}
          placeholder="Escribe tu texto..."
          style={{
            fontFamily: textFontStack(section.fontFamily),
            textAlign: section.textAlign ?? "left",
            color: section.textColor || (isHeading ? "#bea05a" : "#211f1d"),
            backgroundColor: section.bgColor ?? "transparent",
            fontWeight: isHeading ? 700 : 400,
            fontSize: isHeading ? "17px" : "14px",
            padding: section.bgColor ? "14px 16px" : "4px 2px",
          }}
        />
      </div>
    );
  };

  const renderImageField = (section: Section) => (
    <div className="w-full">
      {section.content ? (
        <div className="relative group/img">
          <img src={section.content} alt="" className="w-full max-h-64 object-cover rounded-xl border border-black/10" />
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <label className="text-[10px] font-medium px-2 py-1 rounded-md bg-black/70 text-white cursor-pointer hover:bg-black/85">
              Cambiar
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(section, e.target.files?.[0])} />
            </label>
          </div>
        </div>
      ) : (
        <div className="w-full rounded-xl border border-dashed border-black/15 bg-black/[0.02] flex flex-col items-center justify-center gap-2 py-8 text-black">
          <ImageIcon size={18} />
          <label className="text-xs font-medium cursor-pointer hover:opacity-70">
            Subir imagen
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(section, e.target.files?.[0])} />
          </label>
          <div className="flex items-center gap-1.5 w-full max-w-xs px-4">
            <input
              value={urlDrafts[section.id] ?? ""}
              onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [section.id]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submitUrl(section)}
              placeholder="o pega una URL"
              className="flex-1 min-w-0 bg-white/70 border border-black/10 rounded-md px-2 py-1 text-[11px] outline-none focus:border-[#a8dfcf]"
            />
            <button
              onClick={() => submitUrl(section)}
              className="shrink-0 text-[11px] px-2 py-1 rounded-md bg-black/[0.05] hover:bg-black/[0.1] font-medium"
            >
              Usar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderVideoField = (section: Section) => (
    <div className="w-full flex flex-col items-center gap-2 py-2">
      {section.content && isRemoteUrl(section.content) ? (
        <a
          href={section.content}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2a9678] text-white text-sm font-semibold"
        >
          ▶ Ver vídeo
        </a>
      ) : section.content ? (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
          Un vídeo subido como archivo no se incluye en el correo — pega una URL de YouTube/Vimeo abajo.
        </p>
      ) : null}
      <div className="flex items-center gap-1.5 w-full max-w-sm">
        <input
          value={urlDrafts[section.id] ?? ""}
          onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [section.id]: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && submitUrl(section)}
          placeholder="https://youtube.com/..."
          className="flex-1 min-w-0 bg-white/70 border border-black/10 rounded-md px-2 py-1 text-[11px] outline-none focus:border-[#f0c39a]"
        />
        <button
          onClick={() => submitUrl(section)}
          className="shrink-0 text-[11px] px-2 py-1 rounded-md bg-black/[0.05] hover:bg-black/[0.1] font-medium"
        >
          Usar
        </button>
      </div>
      <label className="text-[11px] text-neutral-400 cursor-pointer hover:text-neutral-600">
        o subir archivo de vídeo
        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(section, e.target.files?.[0])} />
      </label>
    </div>
  );

  const renderButtonField = (section: Section) => (
    <div className="w-full flex flex-col items-center gap-2 py-1">
      <span
        className="inline-block text-center text-sm font-semibold rounded-md px-6 py-3 text-white max-w-full truncate"
        style={{ background: section.color ?? "#bea05a" }}
      >
        {section.content || "Botón"}
      </span>
      <div className="flex items-center gap-1.5 w-full flex-wrap">
        <input
          value={section.content}
          onChange={(e) => updateSection(section.id, { content: e.target.value })}
          placeholder="Texto del botón"
          className="flex-1 min-w-[100px] bg-white/70 border border-black/10 rounded-md px-2 py-1 text-[11px] outline-none focus:border-[#bea05a]"
        />
        <input
          value={section.url ?? ""}
          onChange={(e) => updateSection(section.id, { url: e.target.value })}
          placeholder="https://..."
          className="flex-1 min-w-[100px] bg-white/70 border border-black/10 rounded-md px-2 py-1 text-[11px] outline-none focus:border-[#bea05a]"
        />
        <input
          type="color"
          value={section.color ?? "#bea05a"}
          onChange={(e) => updateSection(section.id, { color: e.target.value })}
          className="w-6 h-6 shrink-0 rounded cursor-pointer border border-black/10 p-0"
        />
      </div>
    </div>
  );

  const renderDividerField = (section: Section) => (
    <div className="w-full flex items-center gap-2 py-2">
      <input
        type="color"
        value={section.color ?? "#1a1a1a"}
        onChange={(e) => updateSection(section.id, { color: e.target.value })}
        className="w-5 h-5 shrink-0 rounded cursor-pointer border border-black/10 p-0"
      />
      <div className="flex-1 h-0.5 rounded-full" style={{ background: section.color ?? "#1a1a1a" }} />
    </div>
  );

  const renderHtmlField = (section: Section) => (
    <div className="w-full flex flex-col gap-1.5">
      <textarea
        value={section.content}
        onChange={(e) => updateSection(section.id, { content: e.target.value })}
        placeholder="Pega aquí el código HTML..."
        spellCheck={false}
        className="w-full h-40 resize-y outline-none border border-black/10 focus:border-[#5a6bc0] rounded-lg p-2 text-[11px] font-mono text-neutral-700 bg-black/[0.02] placeholder:text-neutral-400"
      />
      {section.content.trim() && (
        <iframe
          title="Vista previa del bloque HTML"
          srcDoc={section.content}
          className="w-full h-64 rounded-lg border border-black/10 bg-white"
          sandbox=""
        />
      )}
    </div>
  );

  const renderField = (section: Section) => {
    switch (section.type) {
      case "text":
        return renderTextField(section);
      case "image":
        return renderImageField(section);
      case "video":
        return renderVideoField(section);
      case "button":
        return renderButtonField(section);
      case "divider":
        return renderDividerField(section);
      case "html":
        return renderHtmlField(section);
      case "row":
        return null;
    }
  };

  const renderSectionWrapper = (section: Section) => (
    <div
      key={section.id}
      className="relative group/section rounded-xl px-2 py-1.5 border border-black/[0.06] hover:bg-black/[0.025] transition-colors"
    >
      <button
        type="button"
        onClick={() => removeSection(section.id)}
        className="absolute -top-1.5 -right-1.5 z-10 p-1 rounded-full bg-white border border-black/10 text-neutral-400 hover:text-[#b9503a] opacity-0 group-hover/section:opacity-100 transition-opacity shadow-sm"
      >
        <Trash2 size={11} />
      </button>
      {renderField(section)}
    </div>
  );

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 rounded-3xl p-6 backdrop-blur-xl w-full max-w-5xl mx-auto"
        style={{
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 30px 60px -20px rgba(33,31,29,0.35)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="type-h2 text-neutral-900">Plantilla de mailing</h2>
            <p className="text-xs text-neutral-500">Pulsa sobre cualquier campo para editarlo directamente.</p>
          </div>

          <div className="flex items-center gap-2">
            {ADD_BUTTONS.map((btn) => (
              <button
                key={btn.type}
                onClick={() => addSection(btn.type)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-black/10 bg-black/[0.03] ${btn.text} font-medium hover:bg-black/[0.06]`}
              >
                <Plus size={12} /> <btn.icon size={13} /> {btn.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (sections.length === 0 || window.confirm("Esto sustituye el contenido actual de la plantilla por el diseño de partida. ¿Continuar?")) {
                  setSections(buildDefaultSections());
                }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-black/[0.04] border border-black/10 text-neutral-600 hover:bg-black/[0.07]"
            >
              <RotateCcw size={12} /> Restaurar plantilla
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800"
            >
              <Send size={13} /> Generar email
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-black/10 bg-black/[0.02] p-6">
          <div className="max-w-[640px] mx-auto bg-white rounded-2xl border border-black/10 shadow-sm p-6 flex flex-col gap-1">
            {sections.length === 0 && (
              <p className="text-center text-xs text-neutral-400 py-10">Añade texto, imágenes, botones o un separador para empezar.</p>
            )}
            {sections.map((section) =>
              section.type === "row" ? (
                <div key={section.id} className="flex gap-4 items-start bg-black/[0.015] border border-black/5 rounded-2xl p-2 my-1">
                  {(section.columns ?? []).map((col) => (
                    <div key={col.id} className="flex-1 min-w-0">
                      {renderSectionWrapper(col)}
                    </div>
                  ))}
                </div>
              ) : (
                renderSectionWrapper(section)
              )
            )}
          </div>
        </div>
      </div>

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="glass rounded-3xl p-5 w-full max-w-2xl max-h-[90vh] flex flex-col gap-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="type-h2 text-neutral-800">Generar email de marketing</h2>
                <p className="text-xs text-neutral-500">
                  {recipients.length} destinatario{recipients.length === 1 ? "" : "s"} en la base de datos de mailing.
                </p>
              </div>
              <button
                onClick={() => setExportOpen(false)}
                className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-black/10 bg-white">
              <iframe
                title="Vista previa del email"
                srcDoc={buildMarketingEmailHtml(sections)}
                className="w-full h-full"
                style={{ minHeight: 360 }}
                sandbox=""
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={downloadEmlDraft}
                disabled={recipients.length === 0}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-40"
              >
                <Mail size={13} /> Generar borrador de correo
              </button>
              <button
                onClick={downloadHtml}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[#a8dfcf]/60 text-black/80 font-medium hover:bg-[#a8dfcf]/80"
              >
                <Download size={13} /> Descargar HTML
              </button>
              <button
                onClick={copyHtml}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-black/[0.04] border border-black/10 text-neutral-700 hover:bg-black/[0.07]"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado" : "Copiar HTML"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              <strong>Generar borrador de correo</strong> descarga un archivo .eml con los destinatarios en CCO, el
              asunto y el diseño ya formateado dentro — ábrelo y tu cliente de correo lo abrirá como un borrador listo
              para enviar. "Descargar HTML" y "Copiar HTML" son para importar la plantilla en una plataforma de email
              marketing (Mailchimp, Brevo...).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
