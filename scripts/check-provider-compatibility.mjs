#!/usr/bin/env node
/**
 * Read-only provider compatibility audit. No payment is signed or sent.
 * Prints the current Circle Discovery counts, Financial Datasets 402 network
 * and LoneStar Oracle Arc option.
 */
const DISCOVERY = "https://api.circle.com/v2/x402/discovery/resources";
const FD = "https://api.financialdatasets.ai/company/facts?ticker=AAPL";
const LSO = "https://equity.lonestaroracle.xyz/equity?ticker=AAPL";

async function get(url, headers = {}) {
  const response = await fetch(url, { headers: { accept: "application/json", ...headers } });
  return response;
}

function decodePaymentRequired(response) {
  const header = response.headers.get("payment-required");
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const arcTestnet = await get(`${DISCOVERY}?category=FINANCIAL_ANALYSIS&network=eip155:5042002&limit=200`);
const arcTestnetJson = await arcTestnet.json();
const arcMainnet = await get(`${DISCOVERY}?category=FINANCIAL_ANALYSIS&network=eip155:5042&limit=200`);
const arcMainnetJson = await arcMainnet.json();
const fd = await get(FD);
const fdTerms = decodePaymentRequired(fd);
const lso = await get(LSO);
const lsoTerms = decodePaymentRequired(lso);

console.log(JSON.stringify({
  capturedAt: new Date().toISOString(),
  arcTestnet: {
    financialAnalysisCount: arcTestnetJson.pagination?.total ?? null,
    services: (arcTestnetJson.items ?? []).slice(0, 10).map((item) => ({
      provider: item.metadata?.provider?.name,
      resource: item.resource,
      category: item.metadata?.provider?.category,
    })),
  },
  arcMainnet: {
    financialAnalysisCount: arcMainnetJson.pagination?.total ?? null,
    providers: [...new Set((arcMainnetJson.items ?? []).map((item) => item.metadata?.provider?.name))].slice(0, 20),
  },
  financialDatasets: {
    status: fd.status,
    networks: fdTerms?.accepts?.map((accept) => accept.network) ?? [],
    assets: fdTerms?.accepts?.map((accept) => accept.asset) ?? [],
    note: "Documented x402 rail is Base mainnet; not Arc-compatible.",
  },
  loneStarOracle: {
    status: lso.status,
    networks: lsoTerms?.accepts?.map((accept) => accept.network) ?? [],
    arcMainnetOption: lsoTerms?.accepts?.find((accept) => accept.network === "eip155:5042") ?? null,
    note: "Arc mainnet only; default Assay policy rejects eip155:5042.",
  },
}, null, 2));
