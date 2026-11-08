import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

// Same typeface as the Mantis mobile app.
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto" });

export const metadata: Metadata = {
  title: "Mantis Render · Renders con IA para arquitectura y construcción",
  description:
    "Sube una vista de SketchUp, un boceto o una foto de la obra y muestra cómo va a quedar con renders fotorrealistas en minutos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
