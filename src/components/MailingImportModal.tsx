import { useRef, useState } from "react";
import { Loader2, Mail, Trash2, Upload, X } from "lucide-react";
import { parseContactsCSV, parseContactsXLSX, rowsToMailingContacts } from "../lib/importMailingContacts";
import type { MailingContact } from "../types";

interface Props {
  contacts: MailingContact[];
  onClose: () => void;
  onImport: (contacts: MailingContact[]) => void;
  onDeleteContact: (id: string) => void;
}

export function MailingImportModal({ contacts, onClose, onImport, onDeleteContact }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    let rows;
    try {
      if (ext === "csv") rows = parseContactsCSV(await file.text());
      else if (ext === "xlsx" || ext === "xls") rows = parseContactsXLSX(await file.arrayBuffer());
      else {
        setError("Formato no reconocido. Usa un archivo .csv, .xlsx o .xls.");
        return;
      }
    } catch {
      setError("No se pudo leer el archivo. Comprueba que el formato sea correcto.");
      return;
    }

    if (rows.length === 0) {
      setError("No se encontraron contactos con email en el archivo.");
      return;
    }

    setImporting(true);
    const { contacts: imported, duplicates } = rowsToMailingContacts(rows, contacts);
    if (imported.length > 0) onImport(imported);
    setImporting(false);

    const parts = [`${imported.length} contacto${imported.length === 1 ? "" : "s"} añadido${imported.length === 1 ? "" : "s"}.`];
    if (duplicates > 0) parts.push(`${duplicates} ya estaba${duplicates === 1 ? "" : "n"} en la lista.`);
    setResult(parts.join(" "));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="type-h2 text-neutral-800">Base de datos de mailing</h2>
            <p className="text-xs text-neutral-500">
              {contacts.length} contacto{contacts.length === 1 ? "" : "s"} — independiente de la base de clientes.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">
              Subir archivo (CSV, Excel)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 text-sm px-3 py-3 rounded-xl border border-dashed border-black/15 text-neutral-600 hover:bg-black/[0.03] disabled:opacity-50"
            >
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing ? "Importando..." : fileName ? fileName : "Selecciona un archivo..."}
            </button>

            {error && <p className="text-xs text-[#b9503a] mt-2">{error}</p>}
            {result && <p className="text-xs text-[#2a9678] mt-2">{result}</p>}

            <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed">
              Columnas: nombre contacto, email, nombre empresa. Solo se importan filas con email — esta lista es
              independiente y nunca se mezcla con la base de datos de clientes.
            </p>
          </div>

          {contacts.length > 0 && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
              <div>
                <label className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2 block">Contactos</label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-black/[0.02] border border-black/6"
                    >
                      <Mail size={12} className="text-[#6a56a0] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-neutral-800 truncate">{c.contactName || c.email}</p>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {c.email}
                          {c.companyName ? ` · ${c.companyName}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteContact(c.id)}
                        className="text-neutral-400 hover:text-[#b9503a] shrink-0 p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
