import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Assay — Covenant operations",
    template: "%s · Assay",
  },
  description:
    "Assay is a privacy-conscious, AI-assisted covenant operations workspace for credit teams. Synthetic data only.",
  applicationName: "Assay",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Assay — Covenant operations",
    description:
      "Contract-aware covenant analysis, deterministic calculations, proof-backed controls and human approval.",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#151515",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="paper-grain antialiased">{children}</body>
    </html>
  );
}
