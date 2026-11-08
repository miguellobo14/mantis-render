import Link from "next/link";
import logo from "@/assets/mantis-logo.png";
import { STYLES, styleImage } from "@/lib/catalog";
import "./landing.css";

const STEPS = [
  {
    title: "Sube tu imagen",
    text: "Una vista de SketchUp, un boceto o una foto de la obra tomada con el celular. También puedes empezar con una plantilla.",
    images: ["/img/landing/obra.webp"],
  },
  {
    title: "Elige el estilo",
    text: "Toca el estilo que quieres y, si te provoca, escribe lo que tienes en mente con tus palabras: “madera clara, luz de tarde”.",
    images: ["/img/estilos/nordico.webp", "/img/estilos/industrial.webp", "/img/estilos/japandi.webp"],
  },
  {
    title: "Ajusta y descarga",
    text: "Recibe hasta 4 versiones, compáralas con tu imagen original, cambia lo que no te convenza y descarga en 4K.",
    images: ["/img/landing/render-aereo.webp"],
  },
];

const TOOLS = [
  {
    title: "Obra gris a terminado",
    text: "Toma una foto de la obra y muestra el espacio terminado y amoblado, con los muros donde están.",
    image: "/img/plantillas/obra-muros.jpg",
    href: "/estudio?tool=obra",
    wide: true,
  },
  {
    title: "Editar solo una zona",
    text: "Escribe “cambia solo el piso” o pinta la zona exacta. Lo demás se queda igual.",
    image: "/img/plantillas/interior-sala.jpg",
    href: "/estudio?tool=interior",
    brush: true,
  },
  {
    title: "Varias versiones",
    text: "Hasta 4 opciones por render para escoger junto con tu cliente.",
    image: "/img/estilos/moderno.webp",
    href: "/estudio?tool=interior",
  },
  {
    title: "Fachadas y paisajismo",
    text: "Materiales, cielo y jardín para tus exteriores, conservando el volumen.",
    image: "/img/landing/render-fachada.webp",
    href: "/estudio?tool=exterior",
  },
  {
    title: "Imagen de referencia",
    text: "Sube una foto que te guste y usamos sus materiales y su ambiente en tu proyecto.",
    image: "/img/estilos/tropical.webp",
    href: "/estudio?tool=interior",
  },
  {
    title: "Mejorar tus renders",
    text: "Más realismo para lo que ya hiciste en Lumion, Enscape o V-Ray, y salida en 4K.",
    image: "/img/landing/render-aereo.webp",
    href: "/estudio?tool=mejorar",
  },
];

const AUDIENCES = [
  {
    title: "Arquitectos",
    text: "Presenta varias opciones de un mismo proyecto desde tu modelo de SketchUp, sin esperar horas de render.",
    image: "/img/landing/render-fachada.webp",
  },
  {
    title: "Ingenieros y constructores",
    text: "Muéstrale al cliente cómo va a quedar la obra cuando todavía está en bloque y arena.",
    image: "/img/landing/obra.webp",
  },
  {
    title: "Diseñadores de interiores",
    text: "Prueba estilos, materiales y luz sobre el mismo espacio hasta que el cliente diga “ese”.",
    image: "/img/estilos/lujo.webp",
  },
];

function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className={`lp-brand ${onDark ? "on-dark" : ""}`}>
      <img src={logo.src} width={logo.width} height={logo.height} alt="" />
      <span>
        <strong>Mantis</strong>
        <small>Render</small>
      </span>
    </span>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-hero">
        <img className="lp-hero-bg" src="/img/landing/render-aereo.webp" alt="Render aéreo de una casa terminada al atardecer" />
        <nav className="lp-nav lp-wrap" aria-label="Principal">
          <Link href="/" aria-label="Mantis Render">
            <Brand onDark />
          </Link>
          <div className="lp-nav-links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#herramientas">Herramientas</a>
            <a href="#estilos">Estilos</a>
            <a href="#para-quien">Para quién</a>
          </div>
          <Link href="/estudio" className="lp-nav-cta">
            Abrir el estudio
          </Link>
        </nav>

        <div className="lp-hero-body lp-wrap">
          <div className="lp-hero-copy">
            <h1>Muéstrale al cliente cómo va a quedar, antes de construirlo.</h1>
            <p>
              Sube una vista de SketchUp, un boceto o una foto de la obra. En minutos tienes renders fotorrealistas de tu
              proyecto, listos para presentar.
            </p>
            <div className="lp-hero-actions">
              <Link href="/estudio" className="lp-cta">
                Crear mi primer render
              </Link>
              <a href="#como-funciona" className="lp-cta-ghost">
                Ver cómo funciona
              </a>
            </div>
          </div>

          <figure className="lp-hero-card">
            <img src="/img/landing/obra.webp" alt="Foto de una casa en obra gris" />
            <figcaption>
              <strong>De la obra gris</strong>
              <span>al render que cierra el proyecto</span>
            </figcaption>
          </figure>
        </div>

        <ul className="lp-hero-facts lp-wrap">
          <li>SketchUp, bocetos y fotos de obra</li>
          <li>Hasta 4 versiones por render</li>
          <li>Edita con tus palabras</li>
          <li>Descarga en 4K</li>
        </ul>
      </header>

      <main>
        <section id="como-funciona" className="lp-section lp-wrap">
          <h2>Tres pasos, sin curva de aprendizaje</h2>
          <ol className="lp-steps">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <div className={`lp-step-visual count-${step.images.length}`}>
                  {step.images.map((src) => (
                    <img key={src} src={src} alt="" loading="lazy" />
                  ))}
                </div>
                <h3>
                  <b>{i + 1}</b> {step.title}
                </h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="herramientas" className="lp-band">
          <div className="lp-section lp-wrap">
            <h2>Todo lo que necesitas para presentar un proyecto</h2>
            <div className="lp-tools">
              {TOOLS.map((tool) => (
                <Link key={tool.title} href={tool.href} className={`lp-tool ${tool.wide ? "is-wide" : ""}`}>
                  <span className="lp-tool-image">
                    <img src={tool.image} alt="" loading="lazy" />
                    {tool.brush && <i className="lp-brush" aria-hidden="true" />}
                  </span>
                  <span className="lp-tool-body">
                    <strong>{tool.title}</strong>
                    <span>{tool.text}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="estilos" className="lp-section lp-wrap">
          <h2>Nueve estilos para empezar</h2>
          <p className="lp-lead">Toca uno y ábrelo directo en el estudio.</p>
          <div className="lp-styles">
            {STYLES.map((style) => (
              <Link key={style.id} href={`/estudio?style=${style.id}`} className="lp-style">
                <img src={styleImage(style.id)} alt="" loading="lazy" />
                <span>{style.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="para-quien" className="lp-band">
          <div className="lp-section lp-wrap">
            <h2>Para quienes diseñan y construyen</h2>
            <div className="lp-audiences">
              {AUDIENCES.map((audience) => (
                <article key={audience.title}>
                  <img src={audience.image} alt="" loading="lazy" />
                  <h3>{audience.title}</h3>
                  <p>{audience.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap">
            <h2>Tu próximo proyecto ya puede verse terminado.</h2>
            <p>Sube una imagen y mira el resultado en minutos.</p>
            <Link href="/estudio" className="lp-cta">
              Crear mi primer render
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer lp-wrap">
        <Brand />
        <p>Renders con IA para arquitectura, construcción e interiorismo.</p>
      </footer>
    </div>
  );
}
