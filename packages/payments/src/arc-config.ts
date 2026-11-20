import { CHAIN_CONFIGS, GATEWAY_DOMAINS } from "@circle-fin/x402-batching/client";

/**
 * Values verified against:
 * - https://developers.circle.com/sdks/gateway-nanopayments-sdk
 * - https://developers.circle.com/gateway/references/contract-addresses
 * - https://docs.arc.io/arc/references/contract-addresses
 * - the Circle SDK's own CHAIN_CONFIGS/GATEWAY_DOMAINS
 *
 * The SDK's own configuration is compared with these constants at every
 * provider construction. A mismatch fails closed instead of signing with an
 * unexpected chain, token or Gateway Wallet address.
 */

export type ArcChainName = "arcTestnet" | "arc";

export const ARC_TESTNET = {
  chain: "arcTestnet",
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

export const ARC_MAINNET = {
  chain: "arc",
  chainId: 5042,
  network: "eip155:5042",
  name: "Arc Mainnet",
  usdc: "0x3600000000000000000000000000000000000000",
  usdcDecimals: 6,
  gatewayWallet: "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE",
  gatewayMinter: "0x2222222d7164433c4C09B0b0D809a9b52C04C205",
  gatewayDomain: 26,
  facilitatorUrl: "https://gateway-api.circle.com",
  rpcUrl: "https://rpc.mainnet.arc.io",
  explorerUrl: "https://explorer.arc.io",
} as const;

export const ARC_CHAINS = {
  arcTestnet: ARC_TESTNET,
  arc: ARC_MAINNET,
} as const;

export type ArcChainConfig = (typeof ARC_CHAINS)[ArcChainName];

export type ArcSdkConfig = {
  chainId: number;
  usdc: string;
  usdcDecimals: number;
  gatewayWallet: string;
  gatewayDomain: number;
  rpcUrl: string;
};

export function arcChainConfig(chain: ArcChainName): ArcChainConfig {
  return ARC_CHAINS[chain];
}

export function arcChainFromNetwork(network: string): ArcChainName | null {
  if (network === ARC_TESTNET.network) return "arcTestnet";
  if (network === ARC_MAINNET.network) return "arc";
  return null;
}

export function arcChainFromId(chainId: number): ArcChainName | null {
  if (chainId === ARC_TESTNET.chainId) return "arcTestnet";
  if (chainId === ARC_MAINNET.chainId) return "arc";
  return null;
}

export function readArcSdkConfig(chain: ArcChainName = "arcTestnet"): ArcSdkConfig {
  const config = CHAIN_CONFIGS[chain];
  const token = config.tokens.USDC;
  if (!token) throw new Error(`The Circle SDK does not expose USDC for ${chain}.`);
  return {
    chainId: config.chain.id,
    usdc: token.address,
    usdcDecimals: token.decimals,
    gatewayWallet: config.gatewayWallet,
    gatewayDomain: GATEWAY_DOMAINS[chain],
    rpcUrl: config.rpcUrl ?? ARC_CHAINS[chain].rpcUrl,
  };
}

export function verifyArcSdkConfig(chain: ArcChainName = "arcTestnet"): ArcSdkConfig {
  const expected = ARC_CHAINS[chain];
  const actual = readArcSdkConfig(chain);
  const mismatches: string[] = [];
  if (actual.chainId !== expected.chainId) mismatches.push(`chainId=${actual.chainId}`);
  if (actual.usdc.toLowerCase() !== expected.usdc.toLowerCase()) mismatches.push(`usdc=${actual.usdc}`);
  if (actual.usdcDecimals !== expected.usdcDecimals) mismatches.push(`usdcDecimals=${actual.usdcDecimals}`);
  if (actual.gatewayWallet.toLowerCase() !== expected.gatewayWallet.toLowerCase()) {
    mismatches.push(`gatewayWallet=${actual.gatewayWallet}`);
  }
  if (actual.gatewayDomain !== expected.gatewayDomain) mismatches.push(`gatewayDomain=${actual.gatewayDomain}`);
  if (mismatches.length > 0) {
    throw new Error(`${expected.name} SDK configuration mismatch: ${mismatches.join(", ")}. Refusing to sign payments.`);
  }
  return actual;
}

export function isArcNetwork(network: string): boolean {
  return arcChainFromNetwork(network) !== null;
}

export function isArcAsset(asset: string, chain: ArcChainName): boolean {
  return asset.toLowerCase() === ARC_CHAINS[chain].usdc.toLowerCase();
}

export function isArcTestnetNetwork(network: string): boolean {
  return network === ARC_TESTNET.network;
}

export function isArcTestnetAsset(asset: string): boolean {
  return isArcAsset(asset, "arcTestnet");
}
