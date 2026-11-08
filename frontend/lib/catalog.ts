// What the studio and the landing offer. Tool and style ids match backend/app/presets.py.

export type IconName = "interior" | "exterior" | "paisajismo" | "obra" | "mejorar";

export interface Tool {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: IconName;
  image: string;
  placeholder: string;
  examples: string[];
  // Where the template gallery opens for this tool.
  templates: string;
  // "Mejorar" keeps the design as it is, so a style makes no sense there.
  usesStyle: boolean;
}

export const TOOLS: Tool[] = [
  {
    id: "interior",
    label: "Interior",
    title: "Render de interior",
    description: "Cambia acabados, muebles y luz de un espacio sin mover los muros.",
    icon: "interior",
    image: "/img/estilos/moderno.webp",
    placeholder: "Cocina moderna, madera clara, luz de tarde",
    examples: ["Madera clara y luz de tarde", "Blancos y lino, luz suave de mañana", "Tonos tierra y luz cálida"],
    templates: "interior",
    usesStyle: true,
  },
  {
    id: "exterior",
    label: "Exterior",
    title: "Render de fachada",
    description: "Materiales, cielo y entorno para tu fachada, conservando el volumen.",
    icon: "exterior",
    image: "/img/landing/render-fachada.webp",
    placeholder: "Fachada contemporánea, concreto a la vista, atardecer",
    examples: ["Concreto a la vista, atardecer", "Madera y vidrio, cielo despejado", "Blanco y piedra, luz de mañana"],
    templates: "fachada",
    usesStyle: true,
  },
  {
    id: "paisajismo",
    label: "Paisajismo",
    title: "Render de paisajismo",
    description: "Jardines, patios y terrazas a partir de una foto o un modelo.",
    icon: "paisajismo",
    image: "/img/plantillas/patio-jardin.jpg",
    placeholder: "Jardín tropical con deck de madera y luz de tarde",
    examples: ["Jardín tropical con deck de madera", "Patio con piedra y plantas nativas", "Terraza con pérgola y luz cálida"],
    templates: "patio",
    usesStyle: true,
  },
  {
    id: "obra",
    label: "Obra gris",
    title: "Obra gris a terminado",
    description: "Convierte una foto de la obra en el espacio terminado y amoblado.",
    icon: "obra",
    image: "/img/landing/obra.webp",
    placeholder: "Casa terminada, fachada blanca, jardín y luz de tarde",
    examples: ["Casa terminada, fachada blanca y jardín", "Apartamento con piso de madera y paredes blancas", "Cocina abierta con mesón de cuarzo"],
    templates: "obra",
    usesStyle: true,
  },
  {
    id: "mejorar",
    label: "Mejorar",
    title: "Mejorar un render",
    description: "Más realismo para tus renders de Lumion, Enscape o V-Ray, sin cambiar el diseño.",
    icon: "mejorar",
    image: "/img/landing/render-aereo.webp",
    placeholder: "Más realismo, luz cálida de tarde y reflejos suaves",
    examples: ["Más realismo en materiales y luz", "Luz cálida de tarde y reflejos suaves"],
    templates: "interior",
    usesStyle: false,
  },
];

export const toolById = (id: string) => TOOLS.find((tool) => tool.id === id) ?? TOOLS[0];

export interface Style {
  id: string;
  label: string;
}

export const STYLES: Style[] = [
  { id: "moderno", label: "Moderno" },
  { id: "minimalista", label: "Minimalista" },
  { id: "nordico", label: "Nórdico" },
  { id: "industrial", label: "Industrial" },
  { id: "tropical", label: "Tropical" },
  { id: "campestre", label: "Campestre" },
  { id: "mediterraneo", label: "Mediterráneo" },
  { id: "japandi", label: "Japandi" },
  { id: "lujo", label: "Clásico de lujo" },
];

export const styleImage = (id: string) => `/img/estilos/${id}.webp`;
export const styleLabel = (id: string) => STYLES.find((style) => style.id === id)?.label ?? id;

export interface Template {
  label: string;
  src: string;
}

export interface TemplateGroup {
  id: string;
  label: string;
  // The tool a template of this group opens with.
  tool: string;
  items: Template[];
}

const plantilla = (label: string, file: string): Template => ({ label, src: `/img/plantillas/${file}.jpg` });

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    id: "interior",
    label: "Interior",
    tool: "interior",
    items: [
      plantilla("Sala", "interior-sala"),
      plantilla("Habitación vacía", "interior-habitacion"),
      plantilla("Dormitorio", "interior-dormitorio"),
      plantilla("Cocina", "interior-cocina"),
      plantilla("Estudio", "interior-estudio"),
    ],
  },
  {
    id: "fachada",
    label: "Fachada",
    tool: "exterior",
    items: [
      plantilla("Casa de un piso", "fachada-un-piso"),
      plantilla("Casa de dos pisos", "fachada-dos-pisos"),
      plantilla("Casa moderna", "fachada-moderna"),
      plantilla("Casa clásica", "fachada-clasica"),
    ],
  },
  {
    id: "patio",
    label: "Patio",
    tool: "paisajismo",
    items: [
      plantilla("Jardín", "patio-jardin"),
      plantilla("Terraza cubierta", "patio-terraza"),
      plantilla("Balcón", "patio-deck"),
      plantilla("Terraza abierta", "patio-exterior"),
      plantilla("Piscina", "patio-piscina"),
    ],
  },
  {
    id: "obra",
    label: "Obra gris",
    tool: "obra",
    items: [
      plantilla("Casa en obra", "obra-casa"),
      plantilla("Muros en bloque", "obra-muros"),
      plantilla("Cimientos y muros", "obra-avance-2"),
    ],
  },
];
