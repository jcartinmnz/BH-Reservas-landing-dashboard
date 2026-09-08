import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

/**
 * Montserrat en los tres pesos que define el manual (docs/MARCA.md §2.4):
 * 300 Light para cuerpo, 700 Bold para titulares, 900 Black para display.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "700", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bread House · Reservas",
    template: "%s · Bread House",
  },
  description:
    "Reservá tu mesa o cotizá tu evento en Bread House. Bistró & café con sucursales en Escazú, Pinares, Cartago y Mall San Pedro.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
};

/**
 * `themeColor` en negro de marca y `maximumScale` sin restringir: limitar el
 * zoom rompe WCAG 1.4.4.
 */
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CR" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
