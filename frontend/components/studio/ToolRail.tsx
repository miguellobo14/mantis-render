import Link from "next/link";
import logo from "@/assets/mantis-logo.png";
import Icon from "@/components/Icon";
import { TOOLS } from "@/lib/catalog";

export type StudioView = "crear" | "renders";

export default function ToolRail({
  view,
  tool,
  rendersCount,
  onTool,
  onView,
}: {
  view: StudioView;
  tool: string;
  rendersCount: number;
  onTool: (id: string) => void;
  onView: (view: StudioView) => void;
}) {
  return (
    <nav className="rail" aria-label="Herramientas">
      <Link href="/" className="rail-logo" aria-label="Volver al inicio de Mantis Render">
        <img src={logo.src} width={logo.width} height={logo.height} alt="" />
      </Link>

      <div className="rail-tools">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rail-item ${view === "crear" && tool === item.id ? "is-active" : ""}`}
            aria-current={view === "crear" && tool === item.id ? "true" : undefined}
            onClick={() => onTool(item.id)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="rail-end">
        <button
          type="button"
          className={`rail-item ${view === "renders" ? "is-active" : ""}`}
          aria-current={view === "renders" ? "true" : undefined}
          onClick={() => onView("renders")}
        >
          <Icon name="renders" size={22} />
          <span>Mis renders</span>
          {rendersCount > 0 && <em className="rail-count">{rendersCount}</em>}
        </button>
      </div>
    </nav>
  );
}
