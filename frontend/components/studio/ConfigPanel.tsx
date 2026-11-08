"use client";

import Icon from "@/components/Icon";
import { STYLES, styleImage, type Tool } from "@/lib/catalog";

export interface Config {
  style: string | null;
  brief: string;
  variants: number;
  reference: File | null;
}

export default function ConfigPanel({
  tool,
  config,
  onChange,
  draft,
  draftUrl,
  referenceUrl,
  onPickFile,
  onPickReference,
  onClearDraft,
  submitting,
  error,
  onSubmit,
}: {
  tool: Tool;
  config: Config;
  onChange: (patch: Partial<Config>) => void;
  draft: File | null;
  draftUrl: string | null;
  referenceUrl: string | null;
  onPickFile: (file: File) => void;
  onPickReference: (file: File) => void;
  onClearDraft: () => void;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  let step = 1;

  return (
    <aside className="config" aria-label="Configuración del render">
      <div className="config-scroll">
        <header className="config-head">
          <h1>{tool.title}</h1>
          <p>{tool.description}</p>
        </header>

        <section className="config-section">
          <h2>
            <b>{step++}</b> Tu imagen
          </h2>
          {draft && draftUrl ? (
            <div className="picked">
              <img src={draftUrl} alt="Imagen elegida" />
              <div>
                <strong>{draft.name}</strong>
                <button type="button" className="link-button" onClick={onClearDraft}>
                  Cambiar imagen
                </button>
              </div>
            </div>
          ) : (
            <label className="config-drop">
              <Icon name="upload" size={20} />
              <span>
                <strong>Sube una imagen</strong>
                <small>SketchUp, boceto o foto. También puedes elegir una plantilla.</small>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </section>

        {tool.usesStyle && (
          <section className="config-section">
            <h2>
              <b>{step++}</b> Estilo <small>Opcional</small>
            </h2>
            <div className="style-grid">
              {STYLES.map((style) => {
                const active = config.style === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={`style-card ${active ? "is-active" : ""}`}
                    aria-pressed={active}
                    onClick={() => onChange({ style: active ? null : style.id })}
                  >
                    <img src={styleImage(style.id)} alt="" loading="lazy" />
                    <span>{style.label}</span>
                    {active && (
                      <i className="style-check">
                        <Icon name="check" size={13} />
                      </i>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="config-section">
          <h2>
            <b>{step++}</b> <label htmlFor="config-brief">¿Qué quieres ver?</label>{" "}
            <small>{tool.usesStyle ? "Opcional si elegiste estilo" : "Opcional"}</small>
          </h2>
          <textarea
            id="config-brief"
            value={config.brief}
            onChange={(e) => onChange({ brief: e.target.value })}
            placeholder={tool.placeholder}
            maxLength={2000}
            rows={3}
          />
          <div className="chips">
            {tool.examples.map((example) => (
              <button key={example} type="button" className="chip" onClick={() => onChange({ brief: example })}>
                {example}
              </button>
            ))}
          </div>
        </section>

        {tool.usesStyle && (
          <details className="config-more">
            <summary>Imagen de referencia</summary>
            <div className="reference-row">
              <label className="reference-drop">
                {referenceUrl ? <img src={referenceUrl} alt="Imagen de referencia" /> : <Icon name="plus" size={20} />}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPickReference(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p>
                Sube una foto que te guste: tomamos sus materiales y su ambiente, no su distribución.
                {config.reference && (
                  <button type="button" className="link-button" onClick={() => onChange({ reference: null })}>
                    Quitar
                  </button>
                )}
              </p>
            </div>
          </details>
        )}
      </div>

      <footer className="config-foot">
        <div className="variants">
          <span id="variants-label">Versiones</span>
          <div className="segmented" role="radiogroup" aria-labelledby="variants-label">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={config.variants === n}
                className={config.variants === n ? "is-active" : ""}
                onClick={() => onChange({ variants: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn-primary btn-generate" disabled={!draft || submitting} onClick={onSubmit}>
          {submitting ? "Enviando…" : !draft ? "Elige una imagen para empezar" : config.variants > 1 ? `Generar ${config.variants} versiones` : "Generar render"}
        </button>
      </footer>
    </aside>
  );
}
