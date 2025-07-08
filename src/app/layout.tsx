import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const experimental_ppr = true;

export const metadata: Metadata = {
  title: "Gebietsmanager",
  description:
    "Verwalten und visualisieren Sie Gebiete auf der Deutschlandkarte",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            {children}
            <Toaster />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
