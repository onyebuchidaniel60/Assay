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
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Assay — Covenant operations",
    description:
      "Contract-aware covenant analysis, deterministic calculations, proof-backed controls and human approval.",
    type: "website",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Assay — synthetic covenant operations" }],
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
