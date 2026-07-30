import {
  Globe,
  MapPin,
  Building2,
  HardHat,
  FolderKanban,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Company } from "../types";

export interface ConnectorItem {
  key: string;
  label: string;
  icon: ReactNode;
  preview: string;
  color: string;
}

export function buildConnectors(company: Company): ConnectorItem[] {
  return [
    {
      key: "web",
      label: "Web",
      icon: <Globe size={13} />,
      preview: company.contact.web ?? "No disponible",
      color: "#a8dfcf",
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: <span className="text-[12px] leading-none">📷</span>,
      preview: company.contact.instagram ?? "No detectado",
      color: "#eeb0c9",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: <span className="text-[10px] font-bold leading-none">in</span>,
      preview: company.contact.linkedin ?? "No detectado",
      color: "#9dc0e8",
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <span className="text-[12px] leading-none">📘</span>,
      preview: company.contact.facebook ?? "No detectado",
      color: "#9faad6",
    },
    {
      key: "maps",
      label: "Google Maps",
      icon: <MapPin size={13} />,
      preview: `${company.city}, ${company.province}`,
      color: "#f0c39a",
    },
    {
      key: "arquitectos",
      label: "Arquitectos relacionados",
      icon: <Building2 size={13} />,
      preview: "2 estudios vinculados en proyectos publicados",
      color: "#d2aeda",
    },
    {
      key: "obras",
      label: "Obras",
      icon: <HardHat size={13} />,
      preview: "3 proyectos residenciales identificados",
      color: "#eda18f",
    },
    {
      key: "proyectos",
      label: "Proyectos",
      icon: <FolderKanban size={13} />,
      preview: "Ficha ampliada de proyectos ejecutados",
      color: "#a79bcb",
    },
  ];
}
