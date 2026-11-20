export function decimalToMinor(value: string): string | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const [whole = "0", fraction = ""] = trimmed.split(".");
  return `${BigInt(whole)}${fraction.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
}

export function minorToDecimal(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const minor = BigInt(value);
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return `${whole.toLocaleString("en-US")}.${fraction}`;
}

export function formatUsdMinor(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const minor = BigInt(value);
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return `$${whole.toLocaleString("en-US")}.${fraction}`;
}

export function formatUsdcMinor(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const minor = BigInt(value);
  const whole = minor / 1_000_000n;
  const fraction = (minor % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${fraction ? `.${fraction}` : ""} USDC`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
