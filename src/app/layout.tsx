import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruptura — Ecos do impossível",
  description: "Um mundo fragmentado. Criaturas impossíveis. Sua próxima evolução. Um Idle RPG de decisões e descobertas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
