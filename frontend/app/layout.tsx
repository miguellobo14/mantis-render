import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

// Same typeface as the Mantis mobile app.
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto" });

export const metadata: Metadata = {
  title: "Mantis Render",
  description: "Renders arquitectónicos con IA a partir de una vista de tu modelo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
