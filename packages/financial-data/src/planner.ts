export type EvidencePlannerInput = {
  /** True only when an analyst explicitly linked a public-company ticker or CIK. */
  publicReferenceLinked: boolean;
  ticker?: string | null;
  cik?: string | null;
  fiscalYear?: number | null;
  termsConfirmed: boolean;
  financialInputsPresent: boolean;
  includePaidCandidates?: boolean;
};

export type EvidenceNeed = {
  key: string;
  kind: "REVENUE_VERIFICATION" | "COMPANY_FACTS" | "EQUITY_FUNDAMENTALS" | "PRIVATE_COMPANY_LIMITATION";
  title: string;
  reason: string;
  providerCandidates: Array<{
    providerId: string;
    displayName: string;
    requiresPayment: boolean;
    paymentNetwork: string | null;
    availability: "AVAILABLE" | "POLICY_GATED" | "POLICY_RESTRICTED" | "NOT_CONFIGURED";
  }>;
  limitations: string[];
};

/**
 * Deterministic evidence planner. It proposes what independent information
 * would be useful; it never authorizes a payment, chooses a price or signs
 * anything. The analyst must explicitly request the evidence.
 */
export function planEvidenceNeeds(input: EvidencePlannerInput): EvidenceNeed[] {
  if (!input.publicReferenceLinked || (!input.ticker && !input.cik)) {
    return [
      {
        key: "private-company-limitation",
        kind: "PRIVATE_COMPANY_LIMITATION",
        title: "No public-company reference linked",
        reason:
          "This borrower has no linked public ticker or CIK. Assay cannot independently verify its figures from SEC EDGAR, and it must not treat another company's public data as proof of this borrower's position.",
        providerCandidates: [],
        limitations: [
          "Private-company financial information must come from the borrower's own documents or an analyst-attested source.",
          "No paid external-data request is proposed when there is no legitimate public-company reference.",
        ],
      },
    ];
  }

  const ticker = input.ticker?.toUpperCase() ?? null;
  const label = ticker ?? `CIK ${input.cik}`;
  const period = input.fiscalYear ? `FY${input.fiscalYear}` : "the latest annual period";
  const needs: EvidenceNeed[] = [
    {
      key: "sec-revenue-verification",
      kind: "REVENUE_VERIFICATION",
      title: `Independently check ${label} revenue for ${period}`,
      reason:
        "The agreement's covenant depends on reported financial figures. A public-company SEC XBRL fact gives the analyst a free, citable independent reference for the linked public entity.",
      providerCandidates: [
        {
          providerId: "sec-edgar",
          displayName: "SEC EDGAR (XBRL company facts)",
          requiresPayment: false,
          paymentNetwork: null,
          availability: "AVAILABLE",
        },
      ],
      limitations: [
        "The SEC fact describes the linked public registrant, not the borrower unless the analyst has confirmed they are the same legal entity.",
        "SEC XBRL values are as filed and can use different taxonomy tags between issuers.",
      ],
    },
    {
      key: "sec-company-facts",
      kind: "COMPANY_FACTS",
      title: `Confirm ${label} identity and filing profile`,
      reason:
        "Before relying on any public-company fact, confirm the CIK, legal name, exchange and fiscal year end so the evidence is tied to the correct entity.",
      providerCandidates: [
        {
          providerId: "sec-edgar",
          displayName: "SEC EDGAR (XBRL company facts)",
          requiresPayment: false,
          paymentNetwork: null,
          availability: "AVAILABLE",
        },
      ],
      limitations: ["Identity confirmation does not confirm the borrower's private financial position."],
    },
  ];

  if (input.includePaidCandidates) {
    needs.push({
      key: "lonestar-equity-context",
      kind: "EQUITY_FUNDAMENTALS",
      title: `Optional market-context check for ${label}`,
      reason:
        "A third-party equity fundamentals or analyst-consensus endpoint can add market context for a listed reference entity. It is optional and must not replace the borrower's own reported figures.",
      providerCandidates: [
        {
          providerId: "lonestar-oracle",
          displayName: "LoneStar Oracle EquityScope",
          requiresPayment: true,
          paymentNetwork: "eip155:5042",
          availability: "POLICY_GATED",
        },
      ],
      limitations: [
        "This provider offers Arc Mainnet USDC (eip155:5042) as standard x402 exact. A payment requires an active spending session, deterministic policy approval and explicit analyst authorization.",
        "Third-party market data is not an audited financial statement and may carry its own licensing limits.",
      ],
    });
  }

  return needs;
}
