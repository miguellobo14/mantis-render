"use client";

import { useEffect, useState } from "react";
import { TEMPLATE_GROUPS, type Template, type TemplateGroup } from "@/lib/catalog";

export default function TemplateGallery({
  initialGroup,
  onPick,
}: {
  initialGroup: string;
  onPick: (template: Template, group: TemplateGroup) => Promise<void>;
}) {
  const [groupId, setGroupId] = useState(initialGroup);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => setGroupId(initialGroup), [initialGroup]);

  const group = TEMPLATE_GROUPS.find((item) => item.id === groupId) ?? TEMPLATE_GROUPS[0];

  return (
    <section className="templates" aria-label="Plantillas">
      <h2>O prueba con una plantilla</h2>
      <div className="template-tabs" role="tablist">
        {TEMPLATE_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === group.id}
            className={item.id === group.id ? "is-active" : ""}
            onClick={() => setGroupId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="template-grid">
        {group.items.map((template) => (
          <button
            key={template.src}
            type="button"
            className="template-card"
            disabled={loading !== null}
            onClick={() => {
              setLoading(template.src);
              onPick(template, group).finally(() => setLoading(null));
            }}
          >
            <img src={template.src} alt="" loading="lazy" />
            <span>{loading === template.src ? "Cargando…" : template.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
