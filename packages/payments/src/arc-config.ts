import { CHAIN_CONFIGS, GATEWAY_DOMAINS } from "@circle-fin/x402-batching/client";

/**
 * Values verified against:
 * - https://developers.circle.com/sdks/gateway-nanopayments-sdk (Arc Testnet)
 * - https://developers.circle.com/gateway/references/contract-addresses
 * - https://docs.arc.io/arc/references/contract-addresses
 * - https://developers.circle.com/gateway-nanopayments/quickstarts/buyer
 *
 * The SDK's own CHAIN_CONFIGS is compared with these constants at every
 * provider construction. A mismatch fails closed instead of signing with an
 * unexpected chain, token or Gateway Wallet address.
 */
export const ARC_TESTNET = {
  chainId: 5042002,
  network: "eip155:5042002",
  name: "Arc Testnet",
  usdc: "0x3600000000000000000000000000000000000000",
  usdcDecimals: 6,
  gatewayWallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
  gatewayMinter: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B",
  gatewayDomain: 26,
  facilitatorUrl: "https://gateway-api-testnet.circle.com",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://explorer.testnet.arc.io",
} as const;

export type ArcSdkConfig = {
  chainId: number;
  usdc: string;
  usdcDecimals: number;
  gatewayWallet: string;
  gatewayDomain: number;
  rpcUrl: string;
};

export function readArcSdkConfig(): ArcSdkConfig {
  const config = CHAIN_CONFIGS.arcTestnet;
  const token = config.tokens.USDC;
  if (!token) throw new Error("The Circle SDK does not expose USDC for arcTestnet.");
  return {
    chainId: config.chain.id,
    usdc: token.address,
    usdcDecimals: token.decimals,
    gatewayWallet: config.gatewayWallet,
    gatewayDomain: GATEWAY_DOMAINS.arcTestnet,
    rpcUrl: config.rpcUrl ?? ARC_TESTNET.rpcUrl,
  };
}

export function verifyArcSdkConfig(): ArcSdkConfig {
  const actual = readArcSdkConfig();
  const mismatches: string[] = [];
  if (actual.chainId !== ARC_TESTNET.chainId) mismatches.push(`chainId=${actual.chainId}`);
  if (actual.usdc.toLowerCase() !== ARC_TESTNET.usdc.toLowerCase()) mismatches.push(`usdc=${actual.usdc}`);
  if (actual.usdcDecimals !== ARC_TESTNET.usdcDecimals) mismatches.push(`usdcDecimals=${actual.usdcDecimals}`);
  if (actual.gatewayWallet.toLowerCase() !== ARC_TESTNET.gatewayWallet.toLowerCase()) {
    mismatches.push(`gatewayWallet=${actual.gatewayWallet}`);
  }
  if (actual.gatewayDomain !== ARC_TESTNET.gatewayDomain) mismatches.push(`gatewayDomain=${actual.gatewayDomain}`);
  if (mismatches.length > 0) {
    throw new Error(`Arc SDK configuration mismatch: ${mismatches.join(", ")}. Refusing to sign payments.`);
  }
  return actual;
}

export function isArcTestnetNetwork(network: string): boolean {
  return network === ARC_TESTNET.network;
}

export function isArcTestnetAsset(asset: string): boolean {
  return asset.toLowerCase() === ARC_TESTNET.usdc.toLowerCase();
}
