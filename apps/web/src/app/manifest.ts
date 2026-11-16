import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Assay — Covenant operations",
    short_name: "Assay",
    description: "Synthetic-data covenant operations with deterministic arithmetic, attestation evidence, proofs and human approval.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F3F0E8",
    theme_color: "#151515",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
