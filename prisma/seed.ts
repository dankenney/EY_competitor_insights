import { PrismaClient, CompetitorCategory } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ey_ccass?schema=public";
const pool = new pg.Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

const competitors = [
  {
    name: "EY",
    slug: "ey",
    shortName: "EY",
    category: "SELF" as CompetitorCategory,
    website: "https://www.ey.com",
    brandColor: "#FFE600",
    publicationUrls: [
      "https://www.ey.com/en_gl/services/climate-change-sustainability-services",
      "https://www.ey.com/en_us/services/sustainability",
      "https://www.ey.com/en_gl/services/assurance/esg-sustainability",
    ],
    gtmUrls: [
      "https://www.ey.com/en_gl/services/sustainability",
      "https://www.ey.com/en_us/services/sustainability",
    ],
  },
  {
    name: "KPMG",
    slug: "kpmg",
    shortName: "KPMG",
    category: "BIG4" as CompetitorCategory,
    website: "https://kpmg.com",
    brandColor: "#00338D",
    publicationUrls: ["https://kpmg.com/xx/en/our-insights/esg.html"],
    gtmUrls: [
      "https://kpmg.com/xx/en/what-we-do/services/ESG.html",
      "https://kpmg.com/xx/en/what-we-do/services/advisory/consulting/kpmg-managed-services/sustainability.html",
    ],
  },
  {
    name: "PwC",
    slug: "pwc",
    shortName: "PwC",
    category: "BIG4" as CompetitorCategory,
    website: "https://www.pwc.com",
    brandColor: "#EB8C00",
    publicationUrls: [
      "https://www.pwc.com/gx/en/issues/esg.html",
      "https://www.pwc.com/gx/en/services/sustainability/publications.html",
    ],
    gtmUrls: ["https://www.pwc.com/gx/en/services/sustainability.html"],
  },
  {
    name: "Deloitte",
    slug: "deloitte",
    shortName: "Deloitte",
    category: "BIG4" as CompetitorCategory,
    website: "https://www.deloitte.com",
    brandColor: "#86BC25",
    publicationUrls: [
      "https://www.deloitte.com/global/en/issues/climate.html",
    ],
    gtmUrls: [
      "https://www.deloitte.com/global/en/services/consulting-risk/services/sustainability-climate.html",
    ],
  },
  {
    name: "ERM",
    slug: "erm",
    shortName: "ERM",
    category: "ENGINEERING" as CompetitorCategory,
    website: "https://www.erm.com",
    brandColor: "#00A3E0",
    publicationUrls: ["https://www.erm.com/insights/"],
    gtmUrls: [
      "https://www.erm.com/about/sustainability/",
      "https://www.erm.com/solutions/data-digital/",
    ],
  },
  {
    name: "WSP",
    slug: "wsp",
    shortName: "WSP",
    category: "ENGINEERING" as CompetitorCategory,
    website: "https://www.wsp.com",
    brandColor: "#E31937",
    publicationUrls: ["https://www.wsp.com/en-gl/insights"],
    gtmUrls: [
      "https://www.wsp.com/en-us/services/sustainability-energy-and-climate-change",
    ],
  },
  {
    name: "Bureau Veritas",
    slug: "bureau-veritas",
    shortName: "BV",
    category: "ENGINEERING" as CompetitorCategory,
    website: "https://www.bureauveritas.com",
    brandColor: "#00205B",
    publicationUrls: ["https://group.bureauveritas.com/magazine"],
    gtmUrls: ["https://group.bureauveritas.com/sustainability"],
  },
  {
    name: "McKinsey",
    slug: "mckinsey",
    shortName: "McKinsey",
    category: "MBB" as CompetitorCategory,
    website: "https://www.mckinsey.com",
    brandColor: "#004B87",
    publicationUrls: [
      "https://www.mckinsey.com/capabilities/sustainability/our-insights",
    ],
    gtmUrls: [
      "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients",
    ],
  },
  {
    name: "BCG",
    slug: "bcg",
    shortName: "BCG",
    category: "MBB" as CompetitorCategory,
    website: "https://www.bcg.com",
    brandColor: "#00843D",
    publicationUrls: [
      "https://www.bcg.com/capabilities/climate-change-sustainability/insights",
    ],
    gtmUrls: [
      "https://www.bcg.com/capabilities/climate-change-sustainability/overview",
    ],
  },
  {
    name: "Accenture",
    slug: "accenture",
    shortName: "Accenture",
    category: "MBB" as CompetitorCategory,
    website: "https://www.accenture.com",
    brandColor: "#A100FF",
    publicationUrls: [
      "https://www.accenture.com/us-en/insights/consulting/sustainability-index",
    ],
    gtmUrls: [
      "https://www.accenture.com/us-en/services/sustainability",
    ],
  },
];

// ---------------------------------------------------------------------------
// AI Prompts
// ---------------------------------------------------------------------------

const defaultPrompts = [
  {
    slug: "screen-publication",
    name: "Publication Relevance Screener",
    description:
      "Quick screening to determine if a publication is relevant to sustainability/ESG competitive intelligence",
    model: "gemini-3.0-flash-preview",
    temperature: 0.1,
    maxTokens: 256,
    responseFormat: "json",
    systemPrompt: `You are a screening filter for a sustainability competitive intelligence system. Your job is to quickly determine whether a publication is relevant to sustainability, ESG, climate change, or related topics.

Return JSON: {"relevant": true/false, "confidence": 0.0-1.0, "reason": "brief reason"}

Be inclusive — anything touching sustainability strategy, ESG reporting, climate risk, environmental compliance, net zero, biodiversity, or sustainable finance is relevant.`,
    userTemplate: `Title: {{title}}
Source: {{competitor}}
Excerpt: {{excerpt}}

Is this publication relevant to sustainability/ESG competitive intelligence?`,
  },
  {
    slug: "classify-publication",
    name: "Publication Classifier",
    description:
      "Full classification of a sustainability publication into the CCaSS taxonomy",
    model: "gemini-3.0-flash-preview",
    temperature: 0.3,
    maxTokens: 2048,
    responseFormat: "json",
    systemPrompt: `You are analyzing a sustainability/ESG publication for competitive intelligence for EY's Climate Change and Sustainability Services (CCaSS) practice.

Classify this publication precisely using the following taxonomy. Return valid JSON matching the schema exactly.

Theme taxonomy (choose exactly one primary, zero or more secondary):
- "Climate change and biodiversity"
- "ESG reporting and regulations"
- "ESG Managed Services"
- "Sustainable finance"
- "Climate tech"

Content types: "Thought Leadership", "Article", "Report", "Video", "Webinar", "Podcast", "Blog Post", "Whitepaper", "Case Study"

Target audience: "C-Suite", "Sustainability Teams", "Finance/Audit", "Board", "General", "Technical"`,
    userTemplate: `Publication from {{competitor}}:

Title: {{title}}
Date: {{date}}
URL: {{url}}
Text: {{text}}

Return JSON:
{
  "primaryTheme": "one of the 5 themes",
  "secondaryThemes": ["zero or more additional themes"],
  "contentType": "one content type",
  "keywords": ["5-10 specific keywords"],
  "frameworksMentioned": ["e.g. CSRD, ISSB, TCFD"],
  "sectorsMentioned": ["e.g. Energy, Financial Services"],
  "geographiesMentioned": ["e.g. US, EU, Global"],
  "targetAudience": "one audience type",
  "summary": "2-3 sentence summary",
  "keyMessagingPoints": ["2-4 key messages"],
  "competitivePositioning": "1-2 sentences on competitive positioning",
  "confidence": 0.0-1.0
}`,
  },
  {
    slug: "classify-regulatory",
    name: "Regulatory Event Classifier",
    description:
      "Classify regulatory events by geography, direction of change, and impact",
    model: "gemini-3.0-flash-preview",
    temperature: 0.2,
    maxTokens: 1536,
    responseFormat: "json",
    systemPrompt: `You are a regulatory intelligence analyst for EY's Climate Change and Sustainability Services (CCaSS) practice. Classify regulatory events related to sustainability, ESG, and climate.

Geography options: "US", "US-State", "Canada", "EU", "UK", "China", "APAC-Australia", "APAC-HongKong", "APAC-Singapore", "APAC-Japan", "Global"

Direction of change: "Pullback/Uncertainty", "Paused", "Mandatory", "Optimised Regulations", "Refinement & Convergence", "Guidance to Mandate", "Voluntary to Mandatory", "New Regulation"

Impact: "High" if changes reporting requirements for Fortune 500 or affects multiple jurisdictions. "Medium" for single jurisdiction or clarifies existing rules. "Low" for guidance-only or minor updates.`,
    userTemplate: `Regulatory event:

Title: {{title}}
Source: {{sourceName}}
Description: {{description}}
Full text: {{text}}

Return JSON:
{
  "geography": "one geography",
  "directionOfChange": "one direction",
  "frameworksAffected": ["list of frameworks"],
  "impactLevel": "High/Medium/Low",
  "summary": "2-3 sentence summary",
  "impactAssessment": "What this means for corporate sustainability teams",
  "relevanceToCcass": "How this affects EY CCaSS service lines",
  "confidence": 0.0-1.0
}`,
  },
  {
    slug: "monthly-synthesis",
    name: "Monthly Executive Synthesis",
    description:
      "Generate monthly competitive intelligence executive briefing",
    model: "gemini-3.0-flash-preview",
    temperature: 0.4,
    maxTokens: 8192,
    responseFormat: null,
    systemPrompt: `You are the chief intelligence analyst for EY's Climate Change and Sustainability Services (CCaSS) practice. Generate the monthly competitive intelligence executive summary for Bruno Sarda and the CCaSS leadership team.

Your audience is senior partners and managing directors who need decision-useful intelligence — not just data. Every insight should connect to "so what does this mean for CCaSS?"

Tone: Confident, direct, analytical. Write like a McKinsey partner briefing, not a research report. Every sentence should earn its place.`,
    userTemplate: `Generate a structured executive briefing covering:

1. **Top 3 Strategic Implications for CCaSS** — specific, actionable insights connecting market signals to CCaSS service lines
2. **Regulatory Landscape Update** — what changed, direction of travel, client impact
3. **Competitive Positioning Shifts** — who moved, how, why; headcount trends; new platforms/campaigns
4. **Market Sentiment Indicators** — client posture on ESG; term usage shifts
5. **Talent Market Dynamics** — layoff events; hiring signals
6. **Watch List** — emerging signals worth monitoring

Data for this period:
{{data_context}}`,
  },
];

// ---------------------------------------------------------------------------
// Demo data helpers
// ---------------------------------------------------------------------------

const THEMES = [
  "Climate change and biodiversity",
  "ESG reporting and regulations",
  "ESG Managed Services",
  "Sustainable finance",
  "Climate tech",
];

const CONTENT_TYPES = [
  "Thought Leadership",
  "Article",
  "Report",
  "Whitepaper",
  "Blog Post",
  "Case Study",
];

const FRAMEWORKS = ["CSRD", "ISSB", "TCFD", "TNFD", "SEC Climate Rule", "EU Taxonomy", "SFDR", "GRI", "SASB"];
const SECTORS = ["Energy", "Financial Services", "Technology", "Manufacturing", "Healthcare", "Real Estate"];
const GEOGRAPHIES = ["US", "EU", "UK", "Global", "APAC"];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems<T>(arr: readonly T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDate(monthsBack: number): Date {
  const now = new Date();
  const daysBack = Math.floor(Math.random() * monthsBack * 30);
  return new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
}

function randomFloat(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Publication templates per competitor (realistic titles)
// ---------------------------------------------------------------------------

const publicationTemplates: Record<string, string[]> = {
  ey: [
    "EY Global Climate Risk Barometer 2026",
    "CSRD first filings: Lessons from the first wave of ESRS reports",
    "The CFO's guide to double materiality assessment — 2026 update",
    "Nature-related disclosures: From TNFD early adoption to mandatory reporting",
    "Sustainable finance: Green bond market hits $1 trillion",
    "EY ESG Managed Services: Scaling CSRD compliance at speed",
    "AI-powered climate scenario analysis for financial institutions",
    "Biodiversity credit markets: Pricing nature for corporate portfolios",
    "Net zero transition plans: What investors expect after COP30",
    "CBAM Phase 2: Full carbon pricing implications for EU importers",
    "EY Sustainability Workforce of the Future 2026 report",
    "Generative AI for ESG: Automating data collection and reporting",
  ],
  kpmg: [
    "KPMG Survey of Sustainability Reporting 2026",
    "CSRD year one: What the first filings tell us",
    "The state of ESG assurance: The road to reasonable assurance",
    "Climate litigation risk: 2026 case law update for boards",
    "KPMG ESG Academy: Building sustainability capabilities at scale",
    "CSDDD implementation: Supply chain due diligence in practice",
    "EU Taxonomy reporting: Year two alignment results",
    "AI-driven ESG assurance: Transforming audit methodology",
    "Scope 3 value chain emissions: New methodologies for 2026",
    "KPMG Climate Change and Decarbonization outlook 2026",
  ],
  pwc: [
    "PwC Global Investor Survey 2026: ESG expectations evolve",
    "State of Climate Tech 2026",
    "CSRD implementation: Second wave companies preparing now",
    "Biodiversity credits: Market mechanisms gaining institutional backing",
    "PwC Net Zero Economy Index 2026",
    "Trust in sustainability data: Moving to reasonable assurance",
    "Just transition finance: Scaling investment for equitable decarbonization",
    "Voluntary carbon markets: ICVCM quality standard impact assessment",
    "ESG integration in M&A: CSDDD reshaping deal diligence",
    "Sustainable finance regulation: 2026 global landscape",
    "PwC Climate Tech investment trends: Q1 2026",
  ],
  deloitte: [
    "Deloitte CxO Sustainability Survey 2026",
    "CSRD compliance: Benchmarking the first wave of reports",
    "Transition planning: From commitments to credible action",
    "The green premium: Evidence from 2026 market data",
    "Deloitte Climate Check 2026: Shifting consumer attitudes on sustainability",
    "Decarbonizing heavy industry: Green hydrogen and CCS progress",
    "Nature positive strategies: Corporate biodiversity action plans",
    "AI sustainability footprint: Managing energy costs of generative AI",
    "ESG risk integration in financial services post-CSRD",
    "Deloitte Global Resilience Report 2026",
    "Climate adaptation finance: Closing the investment gap",
  ],
  mckinsey: [
    "The net-zero transition 2026: Tracking progress against pathways",
    "Climate physical risk: Updated hazard modeling for corporates",
    "Sustainability governance: Board effectiveness in the CSRD era",
    "McKinsey on Climate Change: Q1 2026 quarterly review",
    "The economics of decarbonization: Sector cost curves updated",
    "Corporate climate adaptation: From risk to resilience strategy",
    "Nature-based solutions: Scaling corporate investment in 2026",
    "Clean energy transition: Technology cost curves and deployment",
    "Climate finance mobilization: Bridging the $4 trillion gap",
    "Sustainability as transformation: 2026 CEO agenda",
  ],
  bcg: [
    "BCG CO2 AI spinoff: standalone company scaling emissions platform",
    "Green business building: Scaling sustainable ventures",
    "Corporate sustainability transformation: Post-CSRD CEO priorities",
    "Biodiversity and business: Nature-positive strategies that work",
    "BCG Carbon Emissions Benchmarking 2026: Industry deep dive",
    "Sustainable supply chains: EUDR compliance and beyond",
    "Climate adaptation investment: Risk repricing in 2026",
    "Green hydrogen economics: Reaching cost parity milestones",
    "ESG data and technology landscape: Market map 2026",
    "The circular economy: From pilots to scaled business models",
  ],
  accenture: [
    "Accenture Sustainability Value Score 2026 report",
    "Generative AI for sustainability: Real-world enterprise use cases",
    "Green software engineering: Reducing AI's carbon footprint",
    "360-degree sustainability transformation: 2026 maturity assessment",
    "Technology and sustainability convergence: 2026 outlook",
    "Supply chain sustainability: AI-powered traceability at scale",
    "The sustainable enterprise: Embedding ESG in digital operations",
    "Carbon accounting platforms: Consolidation and AI integration trends",
    "Sustainability data architecture: Building enterprise-grade ESG systems",
    "Accenture Life Trends 2026: Sustainability and consumer behavior",
  ],
  erm: [
    "ERM Sustainability Report 2026",
    "PFAS remediation: Regulatory tightening and treatment advances",
    "Environmental due diligence: ESG in private equity post-CSDDD",
    "Nature-related risk assessment: TNFD-aligned frameworks in practice",
    "Climate adaptation engineering: Infrastructure resilience planning",
    "Contaminated land management: AI-enhanced site assessment",
    "Air quality and energy transition: 2026 regulatory update",
    "ERM Digital: AI-enhanced environmental data analytics",
  ],
  wsp: [
    "WSP Global Status of Climate Adaptation 2026",
    "Designing resilient infrastructure for a 1.5°C+ world",
    "Net zero buildings: Engineering pathways for existing stock",
    "Water scarcity and climate: Engineering solutions for 2026",
    "Renewable energy grid integration: Managing intermittency at scale",
    "Circular economy engineering: Industrial symbiosis case studies",
    "WSP Climate and Sustainability technical advisory overview 2026",
    "Hydrogen infrastructure: From pilots to commercial-scale deployment",
  ],
  "bureau-veritas": [
    "Bureau Veritas Green Line certification: 2026 standards update",
    "CSRD assurance: Third-party verification demand surges",
    "Supply chain sustainability auditing: CSDDD readiness",
    "Carbon credit verification: Integrity frameworks in practice",
    "Renewable energy certification: PPA verification trends",
    "BV sustainability data verification: AI-assisted audit services",
    "Circular economy product certification: EU Ecodesign Regulation",
  ],
};

// ---------------------------------------------------------------------------
// Regulatory events
// ---------------------------------------------------------------------------

const regulatoryEvents = [
  {
    title: "EU Omnibus I adopted — CSRD scope narrowed by ~80%, Wave 2 delayed two years",
    description: "The Omnibus I directive, published in the EU Official Journal on 26 February 2026, dramatically narrows CSRD scope to companies with 1,000+ employees AND €450M+ turnover. Wave 2 reporting delayed by two years to 2028 for FY2027. Listed SMEs removed from mandatory scope.",
    sourceName: "European Commission",
    sourceUrl: "https://finance.ec.europa.eu/financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
    geography: "EU",
    directionOfChange: "Refinement & Convergence",
    frameworksAffected: ["CSRD", "ESRS", "EU Taxonomy"],
    impactLevel: "High",
    aiSummary: "The Omnibus I package is the biggest shift in EU sustainability regulation since CSRD was adopted. Scope narrowed from ~50,000 companies to ~10,000. Wave 1 (large PIEs, 500+ employees) continue reporting but with 'quick fix' amendments allowing 2024-level reporting for FY2025-2026. Wave 2 delayed to 2028. Wave 3 (listed SMEs) removed from mandatory scope entirely. Simplified ESRS expected via delegated act by Q3 2026.",
    aiImpactAssessment: "Wave 1 filers get breathing room with simplified requirements. Wave 2 companies have two extra years but should not delay preparation. The reduced scope means fewer companies in the advisory pipeline, but remaining in-scope companies need deeper support.",
    aiRelevanceToCcass: "Mixed impact: smaller total addressable market but higher complexity per engagement. CCaSS should pivot messaging from 'CSRD readiness at scale' to 'CSRD quality and assurance for in-scope companies.' Wave 2 advisory window extends to 2027-2028.",
  },
  {
    title: "SEC ends defense of Climate Disclosure Rule — stay continues indefinitely",
    description: "The SEC voted in March 2025 to stop defending its climate disclosure rule in court. The Eighth Circuit placed the case in abeyance. The rule remains on the books but is effectively dead.",
    sourceName: "SEC",
    sourceUrl: "https://www.sec.gov/rules-regulations/2024/03/s7-10-22",
    geography: "US",
    directionOfChange: "Pullback/Uncertainty",
    frameworksAffected: ["SEC Climate Rule"],
    impactLevel: "High",
    aiSummary: "The SEC climate disclosure rule is effectively dead. The Commission voted to end its defense in March 2025, and the Eighth Circuit placed the case in abeyance until the SEC either rescinds the rule or renews defense. The rule has not been formally withdrawn but the stay continues indefinitely. Despite this, investor expectations, California state laws, and CSRD extraterritorial reach mean US companies still face de facto disclosure requirements.",
    aiImpactAssessment: "US companies face a fragmented landscape: no federal mandate but California SB 253/SB 261, CSRD extraterritorial scope, and investor pressure create a complex compliance mosaic. Several additional states (New York, Colorado, New Jersey, Illinois) have introduced similar legislation.",
    aiRelevanceToCcass: "Advisory opportunity shifts from SEC compliance to multi-framework navigation. Help US multinationals manage California + CSRD + state-level + investor disclosure requirements.",
  },
  {
    title: "ISSB Standards: 21 jurisdictions adopted, 37 advancing — global baseline solidifying",
    description: "Twenty-one jurisdictions have formally adopted ISSB standards (IFRS S1/S2) on a voluntary or mandatory basis. Thirty-seven jurisdictions total are taking steps toward adoption, representing ~60% of global GDP.",
    sourceName: "IFRS Foundation",
    sourceUrl: "https://www.ifrs.org/ifrs-sustainability-disclosure-standards-around-the-world/jurisdictional-guide/",
    geography: "Global",
    directionOfChange: "Voluntary to Mandatory",
    frameworksAffected: ["ISSB", "IFRS S1", "IFRS S2"],
    impactLevel: "High",
    aiSummary: "ISSB adoption is accelerating: 21 jurisdictions have formally adopted and 37 total are advancing toward implementation, covering ~60% of global GDP and market cap. New mandates effective in 2026 include Chile, Qatar, and Mexico. The ISSB is also developing standards on biodiversity and human capital, signaling scope expansion beyond climate.",
    aiImpactAssessment: "Multinational companies face ISSB-aligned requirements across an expanding set of jurisdictions. Interoperability between ESRS (EU) and ISSB remains the key technical challenge for dual-framework filers.",
    aiRelevanceToCcass: "ISSB advisory is a growing CCaSS revenue stream, especially for cross-border companies. Position as the interoperability expert bridging ESRS and ISSB requirements.",
  },
  {
    title: "CSDDD delayed to 2029 under Omnibus I — scope significantly narrowed",
    description: "The Omnibus I package postpones CSDDD transposition to July 2028 and application to July 2029. Scope raised to companies with 5,000+ employees and €1.5B+ turnover. Climate transition plan requirement deleted. Civil liability regime removed.",
    sourceName: "European Commission",
    sourceUrl: "https://commission.europa.eu/topics/business-and-industry/doing-business-eu/sustainability-due-diligence-responsible-business/corporate-sustainability-due-diligence_en",
    geography: "EU",
    directionOfChange: "Refinement & Convergence",
    frameworksAffected: ["CSDDD", "CSRD"],
    impactLevel: "High",
    aiSummary: "CSDDD has been substantially weakened and delayed under Omnibus I. The transposition deadline moved from July 2026 to July 2028, with company application from July 2029. The scope is dramatically narrowed to 5,000+ employees AND €1.5B+ turnover (up from 1,000/€450M). The mandatory climate transition plan requirement has been fully deleted, and the EU-wide civil liability regime removed. However, the risk-based due diligence approach across the full value chain is preserved.",
    aiImpactAssessment: "Fewer companies in scope, less urgency. But the delayed timeline means companies that were preparing can redirect resources. The deletion of climate transition plans removes a major service line opportunity.",
    aiRelevanceToCcass: "Significant reduction in near-term CSDDD advisory revenue. CCaSS should reposition from 'CSDDD readiness' to broader supply chain sustainability advisory. The 2029 application date means advisory work starts 2027-2028 at earliest for most companies.",
  },
  {
    title: "TNFD exceeds 730 adopters — nature disclosure momentum continues",
    description: "The Taskforce on Nature-related Financial Disclosures reaches 733 adopters across 56 countries as of November 2025, a 46% increase year-over-year. Financial institutions representing $22.4 trillion AUM are adopting.",
    sourceName: "TNFD",
    sourceUrl: "https://tnfd.global/engage/tnfd-adopters-list/",
    geography: "Global",
    directionOfChange: "Guidance to Mandate",
    frameworksAffected: ["TNFD", "ESRS E4 Biodiversity", "GRI 101 Biodiversity"],
    impactLevel: "Medium",
    aiSummary: "TNFD adoption grew 46% year-over-year to 733 organisations across 56 countries by November 2025, including 179 financial institutions with $22.4 trillion AUM. Adoption is outpacing TCFD at the same stage. ESRS E4 (biodiversity) alignment with TNFD is strengthening the path toward mandatory nature-related reporting in the EU.",
    aiImpactAssessment: "Companies in high nature-dependency sectors (food, agriculture, mining, real estate) face growing voluntary pressure, with mandatory requirements likely by 2028-2030. Nature-related risk assessment capabilities are becoming table stakes for ESG advisory.",
    aiRelevanceToCcass: "Biodiversity advisory is moving from niche to mainstream. CCaSS should build nature/biodiversity capability now — the voluntary adoption wave creates immediate advisory opportunities, with mandatory requirements on the horizon.",
  },
  {
    title: "California SB 253 first Scope 1/2 filing deadline: August 10, 2026. SB 261 under injunction.",
    description: "CARB approved SB 253 and SB 261 regulations on February 26, 2026. SB 253 Scope 1/2 reporting deadline is August 10, 2026 for companies with $1B+ California revenue. SB 261 (climate risk reports) remains under Ninth Circuit injunction.",
    sourceName: "California Air Resources Board",
    sourceUrl: "https://ww2.arb.ca.gov/our-work/programs/california-corporate-greenhouse-gas-ghg-reporting-and-climate-related-financial",
    geography: "US-State",
    directionOfChange: "Mandatory",
    frameworksAffected: ["SB 253", "SB 261"],
    impactLevel: "High",
    aiSummary: "California's climate disclosure framework is taking shape despite litigation. CARB unanimously approved regulations for both laws on February 26, 2026. SB 253 (emissions reporting) moves forward with first Scope 1/2 filings due August 10, 2026 — the Ninth Circuit declined to enjoin it. SB 261 (climate risk reports) remains paused under injunction, with the original January 2026 deadline missed. Scope 3 reporting under SB 253 is deferred to 2027. Only ~120 companies voluntarily filed SB 261 reports.",
    aiImpactAssessment: "With the SEC rule dead, SB 253 becomes the primary US mandatory emissions disclosure regime for large companies. The August 2026 deadline creates urgent demand for Scope 1/2 measurement and reporting infrastructure.",
    aiRelevanceToCcass: "Critical near-term US revenue opportunity. SB 253 Scope 1/2 deadline in August 2026 is imminent. CCaSS should target companies with $1B+ California revenue that lack emissions reporting capabilities. Scope 3 advisory for 2027 is the next wave.",
  },
  {
    title: "UK Sustainability Reporting Standards (UK SRS) published for voluntary use",
    description: "UK government publishes finalized UK SRS S1 and S2 on February 25, 2026 for voluntary use, aligned with ISSB. FCA consulting on mandatory climate reporting from 2027.",
    sourceName: "UK Department for Business and Trade",
    sourceUrl: "https://www.gov.uk/government/publications/uk-sustainability-reporting-standards-uk-srs-s1-and-uk-srs-s2",
    geography: "UK",
    directionOfChange: "Guidance to Mandate",
    frameworksAffected: ["UK SRS", "ISSB"],
    impactLevel: "Medium",
    aiSummary: "The UK published finalized UK SRS S1 and S2 on February 25, 2026 for voluntary use, closely aligned with ISSB standards. The FCA is consulting (deadline March 20, 2026) on mandating climate disclosures (UK SRS S2) for listed companies from 2027, with Scope 3 on a comply-or-explain basis from 2028. Non-climate sustainability reporting (UK SRS S1) would follow on a comply-or-explain basis from 2029.",
    aiImpactAssessment: "UK-listed companies should prepare for mandatory UK SRS S2 from 2027, while managing CSRD obligations for EU operations. The phased approach gives companies time but multi-framework complexity increases.",
    aiRelevanceToCcass: "UK readiness advisory opportunity. Early voluntary adoption in 2026 positions clients well. Cross-jurisdictional advisory for London-listed companies navigating UK SRS + CSRD + ISSB is the key value proposition.",
  },
  {
    title: "Singapore and Hong Kong ISSB-aligned climate reporting phasing in for large caps",
    description: "Singapore and Hong Kong Scope 1/2 mandatory reporting began FY2025 for all listed companies. Full ISSB-aligned requirements for large-cap indices (STI, Hang Seng LargeCap) mandated from FY2025-2026. Smaller companies given extended timelines.",
    sourceName: "SGX RegCo",
    sourceUrl: "https://www.sgx.com/sustainable-finance/sustainability-reporting",
    geography: "APAC-Singapore",
    directionOfChange: "Mandatory",
    frameworksAffected: ["ISSB", "SGX Climate", "HKEX Climate"],
    impactLevel: "Medium",
    aiSummary: "APAC ISSB-aligned reporting is live but with extended phase-in periods. Singapore: STI constituents report full ISSB-based disclosures from FY2025, Scope 3 from FY2026; broader listed companies deferred to FY2028-2030. Hong Kong: Hang Seng LargeCap issuers move from comply-or-explain to mandatory for full climate requirements from FY2026. Both jurisdictions extended timelines for smaller companies, citing economic uncertainty.",
    aiImpactAssessment: "Large-cap companies in Singapore and Hong Kong are preparing now. Smaller listed companies have breathing room but should use the extended timelines to build capability, not delay.",
    aiRelevanceToCcass: "APAC advisory demand is concentrated in large-cap companies today. CCaSS should build delivery capacity in Singapore/Hong Kong for immediate demand, with broader market access as timelines approach.",
  },
  {
    title: "Australia Group 2 entities enter mandatory climate reporting scope",
    description: "Australia's climate disclosure mandate expands to Group 2 entities (revenue >$200M) for FY2026, following Group 1 (>$500M) in FY2025.",
    sourceName: "Australian Treasury",
    sourceUrl: "https://standards.aasb.gov.au/aasb-s2-sep-2024",
    geography: "APAC-Australia",
    directionOfChange: "Mandatory",
    frameworksAffected: ["AASB S1", "AASB S2", "ISSB"],
    impactLevel: "Medium",
    aiSummary: "Australia's phased implementation brings thousands more companies into scope. Group 2 entities (revenue >$200M) must report for FY2026. Lessons from Group 1 early filers are informing implementation guidance.",
    aiImpactAssessment: "Mid-cap Australian companies now need climate reporting capabilities. Many lack the internal resources and data infrastructure of Group 1 filers.",
    aiRelevanceToCcass: "Growing Australian client base. Group 2 companies are ideal managed services clients — they need outsourced sustainability reporting capability.",
  },
  {
    title: "EU Green Claims Directive adopted — substantiation requirements begin 2027",
    description: "The EU Green Claims Directive is formally adopted, requiring companies to substantiate all environmental claims with verified evidence. Transitional period until mid-2027.",
    sourceName: "European Parliament",
    sourceUrl: "https://environment.ec.europa.eu/topics/circular-economy-topics/green-claims_en",
    geography: "EU",
    directionOfChange: "New Regulation",
    frameworksAffected: ["Green Claims Directive", "EU Ecodesign"],
    impactLevel: "Medium",
    aiSummary: "The Green Claims Directive is now law. Companies must substantiate environmental claims (including 'carbon neutral', 'eco-friendly', 'sustainable') with scientific evidence verified by accredited bodies.",
    aiImpactAssessment: "Major impact on marketing, product labeling, and financial products. Companies need claim verification infrastructure and processes.",
    aiRelevanceToCcass: "New assurance revenue stream: environmental claim verification. Natural extension of ESG assurance. Cross-sell with CSRD clients.",
  },
  {
    title: "EUDR enforcement delayed again to December 30, 2026 — simplified scope",
    description: "The EU Deforestation Regulation enforcement postponed a second time to December 30, 2026 for large operators (June 2027 for SMEs). Scope simplified: only first-to-market operators responsible for due diligence statements.",
    sourceName: "European Commission",
    sourceUrl: "https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en",
    geography: "EU",
    directionOfChange: "Mandatory",
    frameworksAffected: ["EUDR"],
    impactLevel: "Medium",
    aiSummary: "EUDR has been delayed a second time. Large operators must comply from December 30, 2026 (originally December 2024). The scope was simplified — only operators first placing products on the EU market submit due diligence statements, not downstream traders. Printed products removed from scope. A Commission simplification review is due April 30, 2026, which could trigger further amendments. Covers soy, palm oil, timber, coffee, cocoa, rubber, and cattle.",
    aiImpactAssessment: "The repeated delays create compliance fatigue and uncertainty, but the fundamental requirements remain. Companies importing relevant commodities should continue building supply chain traceability and geolocation data capabilities.",
    aiRelevanceToCcass: "EUDR advisory remains relevant but timeline is pushed back. Position EUDR compliance as part of broader CSDDD supply chain due diligence offering. The December 2026 deadline means advisory work should accelerate from Q2 2026.",
  },
];

// ---------------------------------------------------------------------------
// Headcount data
// ---------------------------------------------------------------------------

interface HeadcountEntry {
  slug: string;
  snapshots: Array<{
    monthsAgo: number;
    total: number;
    us: number;
    uk: number;
    india: number;
    eu: number;
    apac: number;
  }>;
}

const headcountData: HeadcountEntry[] = [
  {
    slug: "ey",
    snapshots: [
      { monthsAgo: 15, total: 5200, us: 1800, uk: 900, india: 800, eu: 1100, apac: 600 },
      { monthsAgo: 12, total: 5500, us: 1900, uk: 930, india: 870, eu: 1160, apac: 640 },
      { monthsAgo: 9, total: 5650, us: 1950, uk: 950, india: 900, eu: 1200, apac: 650 },
      { monthsAgo: 6, total: 5800, us: 2000, uk: 970, india: 920, eu: 1240, apac: 670 },
      { monthsAgo: 3, total: 6000, us: 2060, uk: 990, india: 950, eu: 1300, apac: 700 },
      { monthsAgo: 0, total: 6200, us: 2120, uk: 1010, india: 980, eu: 1360, apac: 730 },
    ],
  },
  {
    slug: "deloitte",
    snapshots: [
      { monthsAgo: 15, total: 6100, us: 2200, uk: 1000, india: 900, eu: 1300, apac: 700 },
      { monthsAgo: 12, total: 5900, us: 2100, uk: 960, india: 890, eu: 1270, apac: 680 },
      { monthsAgo: 9, total: 5950, us: 2120, uk: 970, india: 900, eu: 1280, apac: 680 },
      { monthsAgo: 6, total: 6050, us: 2160, uk: 980, india: 920, eu: 1300, apac: 690 },
      { monthsAgo: 3, total: 6200, us: 2210, uk: 1000, india: 950, eu: 1340, apac: 700 },
      { monthsAgo: 0, total: 6350, us: 2260, uk: 1020, india: 970, eu: 1380, apac: 720 },
    ],
  },
  {
    slug: "kpmg",
    snapshots: [
      { monthsAgo: 15, total: 4000, us: 1400, uk: 700, india: 500, eu: 900, apac: 500 },
      { monthsAgo: 12, total: 4200, us: 1460, uk: 740, india: 540, eu: 940, apac: 520 },
      { monthsAgo: 9, total: 4350, us: 1500, uk: 760, india: 560, eu: 980, apac: 550 },
      { monthsAgo: 6, total: 4500, us: 1550, uk: 780, india: 580, eu: 1020, apac: 570 },
      { monthsAgo: 3, total: 4650, us: 1600, uk: 800, india: 600, eu: 1060, apac: 590 },
      { monthsAgo: 0, total: 4800, us: 1650, uk: 820, india: 620, eu: 1100, apac: 610 },
    ],
  },
  {
    slug: "pwc",
    snapshots: [
      { monthsAgo: 15, total: 4800, us: 1700, uk: 850, india: 600, eu: 1050, apac: 600 },
      { monthsAgo: 12, total: 5000, us: 1760, uk: 880, india: 640, eu: 1100, apac: 620 },
      { monthsAgo: 9, total: 5100, us: 1800, uk: 900, india: 660, eu: 1110, apac: 630 },
      { monthsAgo: 6, total: 5200, us: 1840, uk: 920, india: 680, eu: 1120, apac: 640 },
      { monthsAgo: 3, total: 5350, us: 1890, uk: 940, india: 700, eu: 1160, apac: 660 },
      { monthsAgo: 0, total: 5500, us: 1940, uk: 960, india: 720, eu: 1200, apac: 680 },
    ],
  },
  {
    slug: "mckinsey",
    snapshots: [
      { monthsAgo: 15, total: 1200, us: 500, uk: 200, india: 100, eu: 250, apac: 150 },
      { monthsAgo: 12, total: 1300, us: 540, uk: 220, india: 120, eu: 270, apac: 150 },
      { monthsAgo: 9, total: 1350, us: 560, uk: 230, india: 130, eu: 280, apac: 150 },
      { monthsAgo: 6, total: 1400, us: 580, uk: 240, india: 140, eu: 290, apac: 150 },
      { monthsAgo: 3, total: 1420, us: 585, uk: 245, india: 145, eu: 290, apac: 155 },
      { monthsAgo: 0, total: 1450, us: 595, uk: 250, india: 150, eu: 295, apac: 160 },
    ],
  },
  {
    slug: "bcg",
    snapshots: [
      { monthsAgo: 15, total: 1100, us: 450, uk: 180, india: 80, eu: 240, apac: 150 },
      { monthsAgo: 12, total: 1000, us: 410, uk: 160, india: 70, eu: 220, apac: 140 },
      { monthsAgo: 9, total: 1050, us: 430, uk: 170, india: 75, eu: 230, apac: 145 },
      { monthsAgo: 6, total: 1100, us: 450, uk: 180, india: 80, eu: 240, apac: 150 },
      { monthsAgo: 3, total: 1130, us: 460, uk: 185, india: 82, eu: 248, apac: 155 },
      { monthsAgo: 0, total: 1160, us: 470, uk: 190, india: 85, eu: 255, apac: 160 },
    ],
  },
  {
    slug: "accenture",
    snapshots: [
      { monthsAgo: 15, total: 3500, us: 1200, uk: 500, india: 700, eu: 700, apac: 400 },
      { monthsAgo: 12, total: 3700, us: 1260, uk: 520, india: 740, eu: 740, apac: 440 },
      { monthsAgo: 9, total: 3800, us: 1290, uk: 530, india: 760, eu: 760, apac: 460 },
      { monthsAgo: 6, total: 3900, us: 1320, uk: 540, india: 780, eu: 780, apac: 480 },
      { monthsAgo: 3, total: 4050, us: 1370, uk: 560, india: 810, eu: 810, apac: 500 },
      { monthsAgo: 0, total: 4200, us: 1420, uk: 580, india: 840, eu: 840, apac: 520 },
    ],
  },
  {
    slug: "erm",
    snapshots: [
      { monthsAgo: 15, total: 2800, us: 800, uk: 600, india: 200, eu: 700, apac: 500 },
      { monthsAgo: 12, total: 2900, us: 820, uk: 620, india: 210, eu: 720, apac: 530 },
      { monthsAgo: 9, total: 2950, us: 835, uk: 630, india: 215, eu: 730, apac: 540 },
      { monthsAgo: 6, total: 3000, us: 850, uk: 640, india: 220, eu: 740, apac: 550 },
      { monthsAgo: 3, total: 3080, us: 870, uk: 655, india: 230, eu: 760, apac: 565 },
      { monthsAgo: 0, total: 3150, us: 890, uk: 670, india: 240, eu: 775, apac: 575 },
    ],
  },
  {
    slug: "wsp",
    snapshots: [
      { monthsAgo: 15, total: 2200, us: 600, uk: 400, india: 100, eu: 600, apac: 500 },
      { monthsAgo: 12, total: 2300, us: 620, uk: 420, india: 110, eu: 620, apac: 530 },
      { monthsAgo: 9, total: 2350, us: 635, uk: 430, india: 115, eu: 630, apac: 540 },
      { monthsAgo: 6, total: 2400, us: 650, uk: 440, india: 120, eu: 640, apac: 550 },
      { monthsAgo: 3, total: 2480, us: 670, uk: 455, india: 128, eu: 660, apac: 567 },
      { monthsAgo: 0, total: 2550, us: 690, uk: 468, india: 135, eu: 680, apac: 577 },
    ],
  },
  {
    slug: "bureau-veritas",
    snapshots: [
      { monthsAgo: 15, total: 1800, us: 400, uk: 300, india: 150, eu: 600, apac: 350 },
      { monthsAgo: 12, total: 1900, us: 420, uk: 310, india: 160, eu: 630, apac: 380 },
      { monthsAgo: 9, total: 1950, us: 430, uk: 315, india: 165, eu: 645, apac: 395 },
      { monthsAgo: 6, total: 2000, us: 440, uk: 320, india: 170, eu: 660, apac: 410 },
      { monthsAgo: 3, total: 2100, us: 460, uk: 335, india: 180, eu: 695, apac: 430 },
      { monthsAgo: 0, total: 2200, us: 480, uk: 350, india: 190, eu: 730, apac: 450 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sustainability talent signals
// Only sustainability-practice-specific events: leadership moves, ESG practice
// expansions/reductions, sustainability team restructurings. NOT general
// corporate layoffs. Sources: press releases, trade press, annual reports.
// ---------------------------------------------------------------------------

const talentSignals = [
  {
    company: "Deloitte",
    slug: "deloitte",
    eventType: "Leadership Move",
    eventDate: 10, // months ago (~May 2025)
    headcountAffected: null,
    division: "Global Sustainability & Climate",
    geography: "Global",
    driver: "Leadership appointment",
    sourceName: "ESG Today",
    sourceUrl: "https://www.esgtoday.com/deloitte-invests-1-billion-in-sustainability-climate-practice/",
    aiSummary: "Deloitte appointed Jennifer Steinmann as first-ever Global Sustainability & Climate Leader, backed by a $1B investment in the practice. The role reports directly to the Global CEO, signaling top-level strategic priority for sustainability services.",
  },
  {
    company: "Deloitte",
    slug: "deloitte",
    eventType: "Technology Partnership",
    eventDate: 4, // months ago (~Nov 2025)
    headcountAffected: null,
    division: "Sustainability Technology",
    geography: "Global",
    driver: "CSRD technology capability",
    sourceName: "PR Newswire / Workiva",
    sourceUrl: "https://www.prnewswire.com/news-releases/deloitte-announces-new-workiva-esg-accelerators-to-help-streamline-csrd-compliance-302310407.html",
    aiSummary: "Deloitte launched four new CSRD-focused ESG accelerators on the Workiva platform: double materiality assessments, financed emissions calculator, ESRS gap mapping, and activity log tracking. Extends their Workiva alliance to directly compete with EY's CSRD managed services.",
  },
  {
    company: "ERM",
    slug: "erm",
    eventType: "ESG Acquisition",
    eventDate: 8,
    headcountAffected: null,
    division: "Climate & Energy Transition",
    geography: "Australia",
    driver: "Capability expansion",
    sourceName: "ERM Newsroom",
    sourceUrl: "https://www.erm.com/about/news/erm-completes-acquisition-of-climate-risk-and-energy-transition-consultancy-energetics/",
    aiSummary: "ERM completed acquisition of Energetics, an Australian climate risk and energy transition consultancy. Strengthens ERM's advisory capabilities in climate scenario analysis, energy transition strategy, and net-zero pathway modeling for heavy industry clients.",
  },
  {
    company: "ERM",
    slug: "erm",
    eventType: "Technology Partnership",
    eventDate: 6,
    headcountAffected: null,
    division: "Digital Sustainability",
    geography: "Global",
    driver: "Carbon accounting capability",
    sourceName: "ERM Newsroom",
    sourceUrl: "https://www.erm.com/about/news/erm-and-persefoni-forge-strategic-alliance-to-help-organizations-meet-their-decarbonization-goals/",
    aiSummary: "ERM formed a strategic alliance with Persefoni to combine ERM's decarbonization advisory with Persefoni's Climate Management & Accounting Platform (CMAP). Positions ERM to compete with Big Four on automated carbon accounting at enterprise scale.",
  },
  {
    company: "McKinsey",
    slug: "mckinsey",
    eventType: "Practice Expansion",
    eventDate: 5,
    headcountAffected: null,
    division: "McKinsey Sustainability",
    geography: "Global",
    driver: "Continued practice build-out",
    sourceName: "Consultancy UK",
    sourceUrl: "https://www.consultancy.uk/news/28033/mckinsey-launches-sustainability-and-esg-consulting-practice",
    aiSummary: "McKinsey Sustainability continues to grow as a full capability with 1,000+ consultants globally, led by Stefan Helmcke. Focus areas include decarbonization, nature-based solutions, and sustainability-linked value creation. Acquired Vivid Economics (~130 staff) to bolster climate economics expertise.",
  },
  {
    company: "PwC",
    slug: "pwc",
    eventType: "Practice Expansion",
    eventDate: 3,
    headcountAffected: null,
    division: "Sustainability & Climate Change",
    geography: "Global",
    driver: "CSRD and CSDDD demand",
    sourceName: "PwC (practice page)",
    sourceUrl: "https://www.pwc.com/gx/en/services/sustainability.html",
    aiSummary: "PwC continues to expand its sustainability practice under Global Leader Colm Kelly, with services spanning climate risk, energy transition, sustainability assurance, and CSRD advisory. Recognized by Verdantix as a Global Leader in both ESG Assurance and Climate Change Consulting.",
  },
  {
    company: "KPMG",
    slug: "kpmg",
    eventType: "Practice Expansion",
    eventDate: 2,
    headcountAffected: null,
    division: "ESG Assurance",
    geography: "EU",
    driver: "CSRD limited assurance demand",
    sourceName: "KPMG (ESG services page)",
    sourceUrl: "https://kpmg.com/xx/en/what-we-do/services/ESG.html",
    aiSummary: "KPMG is expanding its ESG assurance capabilities across Europe to meet demand for CSRD limited assurance engagements, offering sustainability managed services with predictable costs and flexible delivery models.",
  },
  {
    company: "Accenture",
    slug: "accenture",
    eventType: "Practice Expansion",
    eventDate: 1,
    headcountAffected: null,
    division: "Sustainability Services",
    geography: "Global",
    driver: "Technology-enabled sustainability services",
    sourceName: "Accenture (practice page)",
    sourceUrl: "https://www.accenture.com/us-en/services/sustainability",
    aiSummary: "Accenture continues building its sustainability services with emphasis on AI-powered data platforms, generative AI for ESG reporting, and supply chain traceability. Recognized for tech-enabled sustainability transformation capabilities.",
  },
  {
    company: "EY",
    slug: "ey",
    eventType: "Practice Expansion",
    eventDate: 1,
    headcountAffected: null,
    division: "CCaSS Practice",
    geography: "Global",
    driver: "CSRD, ISSB, and biodiversity demand",
    sourceName: "EY (practice page)",
    sourceUrl: "https://www.ey.com/en_gl/services/sustainability",
    aiSummary: "EY's CCaSS practice continues to grow globally, with focus areas including CSRD advisory, ISSB multi-jurisdictional readiness, biodiversity/TNFD advisory, and ESG assurance. Delivery concentrated in EU, APAC, and India centers.",
  },
  {
    company: "BCG",
    slug: "bcg",
    eventType: "Practice Expansion",
    eventDate: 2,
    headcountAffected: null,
    division: "Climate & Sustainability",
    geography: "Global",
    driver: "Climate advisory demand",
    sourceName: "BCG (practice page)",
    sourceUrl: "https://www.bcg.com/capabilities/climate-change-sustainability/overview",
    aiSummary: "BCG's Climate & Sustainability practice continues to operate as a full capability, combining dedicated sustainability consultants with industry-embedded expertise. Focus areas include decarbonization, nature-based solutions, and climate finance advisory.",
  },
];

// ---------------------------------------------------------------------------
// AI Positioning seed data
// ---------------------------------------------------------------------------

const aiPageUrlsBySlug: Record<string, string[]> = {
  ey: [
    "https://www.ey.com/en_gl/services/sustainability",
    "https://www.ey.com/en_gl/services/climate-change-sustainability-services",
  ],
  kpmg: [
    "https://kpmg.com/xx/en/our-insights/esg/ai-enabling-climate-outcomes-and-powering-the-energy-transition.html",
  ],
  pwc: [
    "https://www.pwc.com/us/en/services/esg/esg-technology.html",
  ],
  deloitte: [
    "https://www.deloitte.com/global/en/issues/climate/greenspacetech.html",
  ],
  erm: [
    "https://www.erm.com/solutions/data-digital/",
  ],
  wsp: [
    "https://www.wsp.com/en-us/hubs/environmental-intelligence",
  ],
  "bureau-veritas": [
    "https://group.bureauveritas.com/services-digital-world",
  ],
  mckinsey: [
    "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients",
  ],
  bcg: [
    "https://co2ai.com/",
  ],
  accenture: [
    "https://www.accenture.com/us-en/services/sustainability/sustainable-technology",
  ],
};

const aiPositioningSignals = [
  // HIGH REALITY — deployed, named clients, metrics
  {
    slug: "bcg",
    title: "CO2 AI (BCG Spinoff): Standalone Company Scaling Emissions Platform",
    sourceUrl: "https://co2ai.com/",
    sourceName: "BCG / CO2 AI",
    signalType: "Platform Update",
    aiCapabilityCategory: "Carbon Accounting & Emissions Management",
    sustainabilityDomain: "Climate & Decarbonization",
    productName: "CO2 AI",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Scaled",
    evidenceScore: 0.90,
    claimSpecificity: 0.85,
    verifiability: 0.85,
    realityScore: 0.88,
    evidenceIndicators: ["Named platform (CO2 AI)", "Spun off as standalone company", "100+ enterprise clients", "Independent media coverage", "Named clients"],
    hypeFlagReasons: [],
    aiSummary: "CO2 AI, originally incubated within BCG, has spun off as a standalone company (raised $12M seed round) while maintaining BCG as a strategic partner. The platform serves 100+ enterprises for Scope 1-3 emissions measurement and product-level carbon footprinting. Remains one of the most mature AI-sustainability products in the market.",
    keyClaimsExtracted: ["Spun off from BCG as standalone company", "$12M seed funding raised", "100+ enterprise clients", "Product-level carbon footprinting"],
    namedClients: ["Reckitt", "General Mills", "Nestlé"],
    quantitativeMetrics: ["100+ enterprise clients", "$12M seed funding", "Product-level carbon footprinting across supply chains"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "ey",
    title: "EY.ai Sustainability Suite: Scaled to 50+ CSRD Engagements",
    sourceUrl: "https://www.ey.com/en_gl/technical/csrd-technical-resources",
    sourceName: "EY",
    signalType: "Platform Update",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "EY.ai Sustainability Suite",
    partnerName: "Microsoft",
    partnerType: "Technology",
    partnerships: [{ name: "Microsoft", type: "Technology", depth: "Deep integration", announced: "2025-06" }],
    maturityLevel: "Scaled",
    evidenceScore: 0.88,
    claimSpecificity: 0.85,
    verifiability: 0.78,
    realityScore: 0.85,
    evidenceIndicators: ["Named product suite", "Microsoft partnership", "50+ CSRD engagements", "Named clients", "Measurable outcomes"],
    hypeFlagReasons: [],
    aiSummary: "EY.ai Sustainability Suite has been deployed across 50+ CSRD compliance engagements. The platform automates double materiality assessments, ESRS data collection, and report generation. First-wave CSRD filers report 60% reduction in manual data collection effort.",
    keyClaimsExtracted: ["50+ CSRD engagements", "60% reduction in manual data collection", "All 12 ESRS standards covered", "Automated double materiality workflow"],
    namedClients: ["Siemens", "Unilever", "Schneider Electric"],
    quantitativeMetrics: ["50+ engagements", "60% data collection time reduction", "12 ESRS standards covered"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "accenture",
    title: "Accenture GenAI for CSRD: Automating Narrative Reporting with Microsoft/Avanade",
    sourceUrl: "https://www.accenture.com/us-en/services/sustainability/sustainable-technology",
    sourceName: "Accenture",
    signalType: "Service Launch",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: null,
    partnerName: "Microsoft",
    partnerType: "Technology",
    partnerships: [{ name: "Microsoft / Avanade", type: "Technology", depth: "Azure OpenAI co-development for CSRD reporting", announced: "2025-09" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.78,
    claimSpecificity: 0.72,
    verifiability: 0.70,
    realityScore: 0.74,
    evidenceIndicators: ["Microsoft/Avanade partnership", "Azure OpenAI integration", "CSRD narrative automation service", "European client deployments"],
    hypeFlagReasons: ["No branded product name — service offering, not standalone product"],
    aiSummary: "Accenture has developed GenAI co-pilots for CSRD narrative reporting in partnership with Microsoft and Avanade, built on Azure OpenAI. The service automates generation of ESRS-compliant disclosure narratives with human-in-the-loop review. This is a consulting service offering rather than a standalone named product, deployed with European clients undertaking CSRD first filings.",
    keyClaimsExtracted: ["GenAI-powered CSRD narrative generation", "ESRS-compliant output", "Azure OpenAI / Avanade co-development", "European client deployments"],
    namedClients: [],
    quantitativeMetrics: ["CSRD narrative automation service", "European client deployments"],
    isSignificant: true,
    monthsAgo: 2,
  },

  // MEDIUM REALITY — partnerships with specifics, pilot → deployed transitions
  {
    slug: "deloitte",
    title: "Deloitte-ServiceNow ESG Platform: Moving from Pilot to Production",
    sourceUrl: "https://www.deloitte.com/global/en/alliances/servicenow.html",
    sourceName: "Deloitte",
    signalType: "Platform Update",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "Deloitte ESG on ServiceNow",
    partnerName: "ServiceNow",
    partnerType: "Technology",
    partnerships: [{ name: "ServiceNow", type: "Technology", depth: "Joint solution", announced: "2025-03" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.65,
    claimSpecificity: 0.68,
    verifiability: 0.58,
    realityScore: 0.64,
    evidenceIndicators: ["Named technology partner", "Production deployment", "Specific CSRD use case", "ServiceNow marketplace listing"],
    hypeFlagReasons: ["Limited named client references", "Metrics not independently verified"],
    aiSummary: "Deloitte's ServiceNow ESG integration has moved from pilot to production, with AI-powered CSRD data workflows now available on the ServiceNow marketplace. Automates data collection from ERP systems and generates ESRS-aligned reports.",
    keyClaimsExtracted: ["ServiceNow marketplace listing", "ERP data integration", "ESRS report generation", "Moved from pilot to production"],
    namedClients: [],
    quantitativeMetrics: ["45% reduction in manual data entry"],
    isSignificant: true,
    monthsAgo: 2,
  },
  {
    slug: "kpmg",
    title: "KPMG ESG Hub: AI-Driven CSRD Assurance Automation",
    sourceUrl: "https://kpmg.com/xx/en/what-we-do/services/ESG.html",
    sourceName: "KPMG (ESG services page)",
    signalType: "Platform Update",
    aiCapabilityCategory: "Sustainability Assurance Automation",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "KPMG ESG Hub",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.62,
    claimSpecificity: 0.65,
    verifiability: 0.52,
    realityScore: 0.60,
    evidenceIndicators: ["Named product", "CSRD assurance-specific", "Deployed with audit teams", "AI anomaly detection"],
    hypeFlagReasons: ["Internal tool not client-facing", "Limited public validation"],
    aiSummary: "KPMG upgraded its ESG Hub with AI-powered assurance automation for CSRD limited assurance engagements. Uses anomaly detection to flag data inconsistencies across ESRS disclosures. Deployed internally with KPMG audit teams across 15 EU member firms.",
    keyClaimsExtracted: ["AI anomaly detection for CSRD assurance", "Deployed across 15 EU member firms", "Automated consistency checking"],
    namedClients: [],
    quantitativeMetrics: ["30% reduction in assurance testing time"],
    isSignificant: true,
    monthsAgo: 2,
  },
  {
    slug: "pwc",
    title: "PwC-Google Cloud ESG Data Engine: First Production Deployments",
    sourceUrl: "https://www.pwc.com/gx/en/services/alliances/google.html",
    sourceName: "PwC",
    signalType: "Client Win / Case Study",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "PwC ESG Data Engine",
    partnerName: "Google Cloud",
    partnerType: "Technology",
    partnerships: [{ name: "Google Cloud", type: "Technology", depth: "Joint solution", announced: "2025-01" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.68,
    claimSpecificity: 0.65,
    verifiability: 0.58,
    realityScore: 0.65,
    evidenceIndicators: ["Named technology partner", "Production deployments", "Vertex AI integration", "CSRD data pipeline"],
    hypeFlagReasons: ["No named clients publicly", "Metrics from PwC press material only"],
    aiSummary: "PwC's Google Cloud ESG Data Engine has moved to production with first client deployments for CSRD data pipeline automation. Uses Vertex AI for data extraction from unstructured sources and BigQuery for ESRS data modeling.",
    keyClaimsExtracted: ["Vertex AI data extraction", "BigQuery ESRS data modeling", "Production CSRD deployments"],
    namedClients: [],
    quantitativeMetrics: ["50% faster data ingestion from unstructured sources"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "mckinsey",
    title: "McKinsey Sustainability Lighthouse: Nature Module and TNFD Alignment",
    sourceUrl: "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients",
    sourceName: "McKinsey (practice page)",
    signalType: "Platform Update",
    aiCapabilityCategory: "Biodiversity & Nature Analytics",
    sustainabilityDomain: "Nature & Biodiversity",
    productName: "Sustainability Lighthouse",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.72,
    claimSpecificity: 0.74,
    verifiability: 0.58,
    realityScore: 0.70,
    evidenceIndicators: ["Named internal tool", "Nature/biodiversity module added", "TNFD-aligned outputs", "Used in engagements"],
    hypeFlagReasons: ["Not externally accessible", "Consulting-embedded only"],
    aiSummary: "McKinsey expanded Sustainability Lighthouse with a nature and biodiversity module that generates TNFD-aligned risk assessments. Combines satellite imagery analysis with financial modeling to quantify nature-related risks. Used in 50+ client engagements in mining, agriculture, and real estate.",
    keyClaimsExtracted: ["TNFD-aligned nature risk assessment", "Satellite imagery analysis", "Nature-related financial risk quantification"],
    namedClients: [],
    quantitativeMetrics: ["Used in 300+ sustainability engagements total", "50+ nature-specific engagements"],
    isSignificant: true,
    monthsAgo: 1,
  },

  // LOW REALITY — vague claims persist
  {
    slug: "pwc",
    title: "PwC Global Sustainability Reporting Survey: AI and Future Trends",
    sourceUrl: "https://www.pwc.com/gx/en/issues/esg/global-sustainability-reporting-survey.html",
    sourceName: "PwC Global Survey",
    signalType: "Thought Leadership",
    aiCapabilityCategory: "General AI & Sustainability Strategy",
    sustainabilityDomain: "Cross-Domain",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Announced",
    evidenceScore: 0.15,
    claimSpecificity: 0.20,
    verifiability: 0.18,
    realityScore: 0.17,
    evidenceIndicators: [],
    hypeFlagReasons: ["Vision piece only", "No specific products or deployments", "Future-oriented claims", "Generic AI references"],
    aiSummary: "Thought leadership article from PwC outlining a future vision for AI in ESG reporting. No specific products, tools, or client examples. Aspirational language about 'AI-powered transformation' without concrete capabilities.",
    keyClaimsExtracted: ["AI will automate 80% of ESG data collection by 2030", "End-to-end AI-powered reporting"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 10,
  },
  {
    slug: "deloitte",
    title: "Deloitte: Powering AI — Environmental Costs and Sustainability of AI Infrastructure",
    sourceUrl: "https://www.deloitte.com/global/en/issues/climate/powering-ai.html",
    sourceName: "Deloitte Insights",
    signalType: "Vague Claim",
    aiCapabilityCategory: "General AI & Sustainability Strategy",
    sustainabilityDomain: "Cross-Domain",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Announced",
    evidenceScore: 0.12,
    claimSpecificity: 0.15,
    verifiability: 0.10,
    realityScore: 0.12,
    evidenceIndicators: [],
    hypeFlagReasons: ["Pure buzzwords", "No named tools or platforms", "Generic AI-powered claims", "No metrics or client references"],
    aiSummary: "Deloitte thought leadership on the environmental costs of powering AI infrastructure, including energy consumption and data center sustainability. General analysis without specific Deloitte tools or products — positions the firm as thinking about AI's own sustainability footprint.",
    keyClaimsExtracted: ["AI infrastructure energy consumption analysis", "Data center sustainability considerations"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 12,
  },
  {
    slug: "kpmg",
    title: "KPMG: AI and Sustainability — Survey of 350 Executives on Green IT Priorities",
    sourceUrl: "https://kpmg.com/us/en/articles/2025/ai-sustainability.html",
    sourceName: "KPMG US",
    signalType: "Thought Leadership",
    aiCapabilityCategory: "General AI & Sustainability Strategy",
    sustainabilityDomain: "Cross-Domain",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Announced",
    evidenceScore: 0.18,
    claimSpecificity: 0.22,
    verifiability: 0.15,
    realityScore: 0.19,
    evidenceIndicators: [],
    hypeFlagReasons: ["Thought leadership only", "No deployments", "Generic responsible AI framing"],
    aiSummary: "KPMG survey of 350 executives on balancing AI and sustainability ambitions. Findings include prioritization of Green IT investments and cross-functional collaboration between ESG and strategy teams. No specific KPMG tools — positions the firm as thought leader on AI-sustainability intersection.",
    keyClaimsExtracted: ["350 executive survey on AI + sustainability", "Green IT investment prioritization", "Cross-functional ESG-strategy collaboration"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 13,
  },

  // DEPLOYED & REAL — engineering firms and niche plays
  {
    slug: "erm",
    title: "ERM Digital: AI-Enhanced Environmental Impact Assessment Platform",
    sourceUrl: "https://www.erm.com/products/",
    sourceName: "ERM",
    signalType: "Platform Update",
    aiCapabilityCategory: "Biodiversity & Nature Analytics",
    sustainabilityDomain: "Nature & Biodiversity",
    productName: "ERM Intelligence",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.75,
    claimSpecificity: 0.72,
    verifiability: 0.65,
    realityScore: 0.72,
    evidenceIndicators: ["Named platform", "Specific EIA use case", "Engineering domain expertise", "TNFD-aligned assessments"],
    hypeFlagReasons: ["Limited public metrics"],
    aiSummary: "ERM's AI-enhanced EIA platform now includes TNFD-aligned nature risk assessment capabilities. Uses NLP for environmental baseline analysis, predictive ecological impact modeling, and satellite-based biodiversity monitoring. Deployed with mining, energy, and infrastructure clients.",
    keyClaimsExtracted: ["NLP-powered environmental baseline analysis", "TNFD-aligned nature risk outputs", "Satellite-based biodiversity monitoring"],
    namedClients: [],
    quantitativeMetrics: ["45% faster EIA turnaround", "TNFD-aligned reports for 20+ clients"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "wsp",
    title: "WSP Climate Intelligence: Deployed for UK Infrastructure Resilience Program",
    sourceUrl: "https://www.wsp.com/en-us/services/climate-resilient-infrastructure",
    sourceName: "WSP",
    signalType: "Client Win / Case Study",
    aiCapabilityCategory: "Climate Modeling & Scenario Analysis",
    sustainabilityDomain: "Climate & Decarbonization",
    productName: "WSP Climate Intelligence",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.68,
    claimSpecificity: 0.70,
    verifiability: 0.58,
    realityScore: 0.66,
    evidenceIndicators: ["Named product", "UK government infrastructure program", "Physical climate risk modeling"],
    hypeFlagReasons: ["Single major deployment", "Government client (less commercially replicable)"],
    aiSummary: "WSP's Climate Intelligence platform was selected for the UK National Infrastructure Commission's climate resilience program. AI-powered physical climate risk assessment for transport, water, and energy infrastructure. First major public-sector deployment of the platform.",
    keyClaimsExtracted: ["UK National Infrastructure Commission deployment", "Physical climate risk for critical infrastructure", "AI-integrated climate scenario modeling"],
    namedClients: ["UK National Infrastructure Commission"],
    quantitativeMetrics: ["Assessment of 500+ infrastructure assets"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "accenture",
    title: "Accenture-Salesforce Net Zero Cloud: EUDR Supply Chain Module",
    sourceUrl: "https://www.accenture.com/us-en/services/salesforce/sustainability",
    sourceName: "Accenture",
    signalType: "Platform Update",
    aiCapabilityCategory: "Supply Chain Traceability & Due Diligence",
    sustainabilityDomain: "Nature & Biodiversity",
    productName: "Salesforce Net Zero Cloud + EUDR",
    partnerName: "Salesforce",
    partnerType: "Technology",
    partnerships: [{ name: "Salesforce", type: "Technology", depth: "Joint solution", announced: "2025-04" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.74,
    claimSpecificity: 0.76,
    verifiability: 0.68,
    realityScore: 0.73,
    evidenceIndicators: ["Named partner platform", "EUDR compliance module", "Geolocation data integration", "Deployed in consumer goods"],
    hypeFlagReasons: [],
    aiSummary: "Accenture added an EUDR compliance module to its Salesforce Net Zero Cloud integration, with AI-powered supply chain traceability and geolocation-based deforestation risk scoring. Deployed with consumer goods and agricultural companies for EUDR readiness.",
    keyClaimsExtracted: ["EUDR supply chain traceability", "Geolocation deforestation risk scoring", "Salesforce platform integration"],
    namedClients: [],
    quantitativeMetrics: ["60% reduction in Scope 3 data collection effort", "EUDR traceability for 10,000+ supplier locations"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "ey",
    title: "EY.ai Sustainability: CSRD and ESG Assurance Technology Stack",
    sourceUrl: "https://www.ey.com/en_gl/services/sustainability",
    sourceName: "EY (practice page)",
    signalType: "Platform Update",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "EY.ai Sustainability",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.70,
    claimSpecificity: 0.65,
    verifiability: 0.60,
    realityScore: 0.65,
    evidenceIndicators: ["Named EY.ai platform", "CSRD assurance capabilities", "ESG technology services"],
    hypeFlagReasons: ["Limited public detail on specific AI tools", "Practice page reference only"],
    aiSummary: "EY continues to invest in AI-powered sustainability capabilities through its EY.ai platform, with specific focus on CSRD assurance automation, ESG data management, and climate risk modeling. The practice page highlights integrated technology and assurance services.",
    keyClaimsExtracted: ["AI-powered CSRD assurance", "ESG data management platform", "Integrated technology + assurance"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "bcg",
    title: "BCG Gamma: EUDR Deforestation Monitoring Deployed with Named FMCG Client",
    sourceUrl: "https://www.bcg.com/capabilities/climate-change-sustainability/insights",
    sourceName: "BCG (insights hub)",
    signalType: "Client Win / Case Study",
    aiCapabilityCategory: "Supply Chain Traceability & Due Diligence",
    sustainabilityDomain: "Nature & Biodiversity",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.82,
    claimSpecificity: 0.85,
    verifiability: 0.70,
    realityScore: 0.80,
    evidenceIndicators: ["Named BCG Gamma involvement", "Satellite imagery + NLP", "EUDR compliance", "Named client"],
    hypeFlagReasons: [],
    aiSummary: "BCG Gamma's AI-powered deforestation monitoring tool is now operational for EUDR compliance with Nestlé as a named client. Uses satellite imagery and NLP analysis of supplier data to verify deforestation-free supply chains across palm oil, soy, and cocoa commodities.",
    keyClaimsExtracted: ["Named client (Nestlé)", "EUDR compliance for palm oil, soy, cocoa", "Satellite + NLP supply chain verification"],
    namedClients: ["Nestlé"],
    quantitativeMetrics: ["92% accuracy in deforestation detection", "50,000+ supplier locations monitored"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "bureau-veritas",
    title: "Bureau Veritas: AI-Enhanced CSRD Assurance Deployed Across EU Operations",
    sourceUrl: "https://certification.bureauveritas.com/needs/sustainability-report-assurance-and-emissions-verification",
    sourceName: "Bureau Veritas",
    signalType: "Platform Update",
    aiCapabilityCategory: "Sustainability Assurance Automation",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "BV ESG Assurance AI",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.58,
    claimSpecificity: 0.60,
    verifiability: 0.48,
    realityScore: 0.56,
    evidenceIndicators: ["Named product", "Deployed across EU operations", "CSRD assurance automation"],
    hypeFlagReasons: ["Limited public metrics", "No independent verification of claims"],
    aiSummary: "Bureau Veritas deployed AI-enhanced ESG assurance tools across its European operations for CSRD limited assurance engagements. Automates document review, data consistency checks, and evidence gathering. Reduces manual testing by an estimated 25%.",
    keyClaimsExtracted: ["AI document review for CSRD assurance", "Deployed across EU operations", "Automated evidence gathering"],
    namedClients: [],
    quantitativeMetrics: ["25% reduction in manual testing effort"],
    isSignificant: true,
    monthsAgo: 2,
  },
  {
    slug: "deloitte",
    title: "Deloitte-Workiva CSRD Accelerators: Four AI Tools for ESRS Compliance",
    sourceUrl: "https://www.prnewswire.com/news-releases/deloitte-announces-new-workiva-esg-accelerators-to-help-streamline-csrd-compliance-302310407.html",
    sourceName: "PR Newswire / Workiva",
    signalType: "Platform Update",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "Deloitte ESG Accelerators (Workiva)",
    partnerName: "Workiva",
    partnerType: "Technology",
    partnerships: [{ name: "Workiva", type: "Technology", depth: "Platform integration", announced: "2024-11" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.80,
    claimSpecificity: 0.82,
    verifiability: 0.78,
    realityScore: 0.80,
    evidenceIndicators: ["Named partner (Workiva)", "Four specific accelerator tools", "Available on Workiva Marketplace", "Press release with specifics"],
    hypeFlagReasons: [],
    aiSummary: "Deloitte launched four CSRD-focused ESG accelerators on the Workiva platform: double materiality assessment, financed emissions calculator (PCAF-aligned), ESRS gap mapping (GRI-to-ESRS), and activity log tracking. Available on Workiva Marketplace alongside advisory services.",
    keyClaimsExtracted: ["Four named CSRD accelerator tools", "Workiva Marketplace availability", "PCAF-aligned financed emissions", "GRI-to-ESRS gap mapping"],
    namedClients: [],
    quantitativeMetrics: ["4 accelerator tools launched", "Available on Workiva Marketplace"],
    isSignificant: true,
    monthsAgo: 4,
  },
  {
    slug: "mckinsey",
    title: "McKinsey Sustainability Insights Hub: AI and Net-Zero Research",
    sourceUrl: "https://www.mckinsey.com/capabilities/sustainability/our-insights",
    sourceName: "McKinsey (insights hub)",
    signalType: "Thought Leadership",
    aiCapabilityCategory: "General AI & Sustainability Strategy",
    sustainabilityDomain: "Cross-Domain",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Announced",
    evidenceScore: 0.25,
    claimSpecificity: 0.30,
    verifiability: 0.22,
    realityScore: 0.26,
    evidenceIndicators: ["Well-researched analysis"],
    hypeFlagReasons: ["Thought leadership only", "No specific McKinsey tools", "General observations"],
    aiSummary: "McKinsey's sustainability insights hub features ongoing research on AI's role in the net-zero transition. References Sustainability Lighthouse use cases but remains primarily research and thought leadership rather than specific product or client case studies.",
    keyClaimsExtracted: ["AI could accelerate decarbonization by 8-13%", "Gen AI reducing sustainability reporting burden by 40-60%", "AI energy consumption is a growing concern"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 2,
  },
];

const aiPositioningPrompts = [
  {
    slug: "screen-ai-signal",
    name: "AI Signal Relevance Screener",
    description:
      "Quick screening to determine if content contains AI + sustainability positioning signals",
    model: "gemini-3.0-flash-preview",
    temperature: 0.1,
    maxTokens: 256,
    responseFormat: "json",
    systemPrompt: `You are a screening filter for a competitive intelligence system tracking how consulting firms position their AI capabilities in sustainability. Your job is to determine whether content is relevant — it must discuss BOTH artificial intelligence/machine learning AND sustainability/ESG/climate topics.

Return JSON: {"relevant": true/false, "confidence": 0.0-1.0, "reason": "brief reason"}

Be inclusive for content that discusses: AI/ML tools for ESG, AI-powered sustainability platforms, partnerships between tech firms and consultancies for sustainability AI, AI in climate risk modeling, generative AI for ESG reporting, etc.
Exclude: General AI content without sustainability angle. General sustainability content without AI angle.`,
    userTemplate: `Title: {{title}}
Source: {{competitor}}
Excerpt: {{excerpt}}

Does this content contain relevant AI + sustainability positioning signals?`,
  },
  {
    slug: "classify-ai-signal",
    name: "AI Positioning Signal Classifier",
    description:
      "Full classification of an AI positioning signal including hype vs reality scoring",
    model: "gemini-3.0-flash-preview",
    temperature: 0.2,
    maxTokens: 3072,
    responseFormat: "json",
    systemPrompt: `You are analyzing competitive intelligence about how consulting/professional services firms position their AI capabilities in sustainability/ESG. Extract structured information and score the signal on a hype-vs-reality scale.

SIGNAL TYPES: "Product Launch", "Partnership Announcement", "Client Win / Case Study", "Thought Leadership", "Hiring Signal", "Acquisition", "Platform Update", "Conference / Demo", "Internal Capability", "Vague Claim"

AI CAPABILITY CATEGORIES: "ESG Data Analytics & Reporting", "Climate Modeling & Scenario Analysis", "Supply Chain Traceability & Due Diligence", "Regulatory Intelligence & Compliance", "Sustainability Assurance Automation", "Carbon Accounting & Emissions Management", "Biodiversity & Nature Analytics", "Sustainable Finance & Investment Screening", "Greenwashing Detection & Claims Verification", "General AI & Sustainability Strategy"

MATURITY LEVELS: "Announced", "Pilot", "Deployed", "Scaled"

SUSTAINABILITY DOMAINS: "Climate & Decarbonization", "ESG Reporting & Disclosure", "Nature & Biodiversity", "Sustainable Finance", "Circular Economy", "Social & Just Transition", "Environmental Compliance", "Cross-Domain"

HYPE VS REALITY SCORING (score each 0.0-1.0):
- evidenceScore: Named client case study with metrics=0.9-1.0, Named client no metrics=0.7-0.8, Internal deployment=0.5-0.6, Partnership with specifics=0.3-0.4, General claim=0.1-0.2, Pure buzzwords=0.0-0.1
- claimSpecificity: Named tech/models vs "proprietary AI"=high. Measurable outcomes vs aspirational=high. Defined scope vs "end-to-end everything"=high.
- verifiability: Publicly accessible/reviewed=0.8-1.0, Independent media=0.5-0.7, Only competitor materials=0.2-0.4`,
    userTemplate: `Content from {{competitor}}:

Title: {{title}}
URL: {{url}}
Date: {{date}}
Text: {{text}}

Return JSON:
{
  "signalType": "one signal type",
  "aiCapabilityCategory": "one capability category",
  "sustainabilityDomain": "one domain",
  "productName": "named product or null",
  "partnerName": "named partner or null",
  "partnerType": "Technology/Data/Academic/Industry or null",
  "partnerships": [{"name": "...", "type": "...", "depth": "...", "announced": "..."}] or null,
  "maturityLevel": "one level",
  "evidenceScore": 0.0-1.0,
  "claimSpecificity": 0.0-1.0,
  "verifiability": 0.0-1.0,
  "evidenceIndicators": ["specific evidence items"],
  "hypeFlagReasons": ["reasons this might be hype"],
  "summary": "2-3 sentence objective summary",
  "keyClaimsExtracted": ["specific claims made"],
  "namedClients": ["any named clients"],
  "quantitativeMetrics": ["any specific numbers/metrics"],
  "isSignificant": true/false,
  "confidence": 0.0-1.0
}`,
  },
  {
    slug: "analyze-ai-positioning",
    name: "AI Positioning Monthly Synthesis",
    description:
      "Monthly synthesis of AI positioning intelligence for leadership",
    model: "gemini-2.5-pro",
    temperature: 0.4,
    maxTokens: 6144,
    responseFormat: null,
    systemPrompt: `You are the chief AI intelligence analyst for EY's Climate Change and Sustainability Services (CCaSS) practice. Generate a monthly AI positioning intelligence report for Bruno Sarda and the CCaSS leadership team.

Your audience is senior partners who need to understand where EY stands relative to competitors on AI capabilities in sustainability — and what to do about it.

CRITICAL: Separate hype from reality. Identify which competitor AI claims are backed by real products/deployments vs marketing theatre. Use the reality scores and evidence to make this assessment.

Tone: Confident, direct, analytical. Every sentence should earn its place. Deliver uncomfortable truths — if EY is behind, say so clearly.`,
    userTemplate: `Generate a structured AI positioning intelligence briefing covering:

1. **Executive Summary** — where EY stands vs competitors on AI in sustainability (2-3 sentences, be direct)
2. **Capability Landscape** — which competitors lead in which AI capability categories and why
3. **Hype vs Reality Assessment** — who is real (products, clients, metrics) vs who is noise (press releases, vague claims)
4. **Partnership Map** — significant technology partnerships and what they mean
5. **EY-Specific Recommendations** — 3-5 specific actions EY should take based on competitive intelligence
6. **Watch List** — emerging signals worth monitoring next month

Data for this period:
{{data_context}}`,
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding database...");

  // Seed competitors
  for (const comp of competitors) {
    await prisma.competitor.upsert({
      where: { slug: comp.slug },
      update: comp,
      create: comp,
    });
  }
  console.log(`Seeded ${competitors.length} competitors`);

  // Seed AI prompts (default + AI positioning)
  const allPrompts = [...defaultPrompts, ...aiPositioningPrompts];
  for (const prompt of allPrompts) {
    await prisma.aiPrompt.upsert({
      where: { slug: prompt.slug },
      update: {
        name: prompt.name,
        description: prompt.description,
        systemPrompt: prompt.systemPrompt,
        userTemplate: prompt.userTemplate,
        model: prompt.model,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        responseFormat: prompt.responseFormat,
      },
      create: prompt,
    });
  }
  console.log(`Seeded ${allPrompts.length} AI prompts`);

  // Update competitor aiPageUrls
  for (const [slug, urls] of Object.entries(aiPageUrlsBySlug)) {
    await prisma.competitor.update({
      where: { slug },
      data: { aiPageUrls: urls },
    });
  }
  console.log("Updated competitor aiPageUrls");

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@ey.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      passwordHash,
    },
  });
  console.log(`Seeded admin user: ${adminEmail}`);

  // ---------- Demo data ----------

  // Fetch competitor records for IDs
  const competitorRecords = await prisma.competitor.findMany();
  const competitorMap = new Map(competitorRecords.map((c) => [c.slug, c]));

  // Seed publications
  let pubCount = 0;
  for (const [slug, titles] of Object.entries(publicationTemplates)) {
    const comp = competitorMap.get(slug);
    if (!comp) continue;

    for (const title of titles) {
      // Use the competitor's real publication landing page as the base URL
      // Append a hash fragment so each publication has a unique URL for the upsert key
      const basePublicationUrl = comp.publicationUrls?.[0] ?? `${comp.website}/insights`;
      const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
      const url = `${basePublicationUrl}#${titleSlug}`;
      const theme = randomItem(THEMES);
      const publishedDate = randomDate(12);
      const isClassified = Math.random() > 0.15; // 85% classified

      await prisma.publication.upsert({
        where: { url },
        update: {},
        create: {
          competitorId: comp.id,
          title,
          url,
          publishedDate,
          contentType: randomItem(CONTENT_TYPES),
          primaryTheme: isClassified ? theme : null,
          secondaryThemes: isClassified ? randomItems(THEMES.filter((t) => t !== theme), 0, 2) : [],
          keywords: isClassified ? randomItems(["CSRD", "ISSB", "net zero", "decarbonization", "biodiversity", "Scope 3", "green bond", "climate risk", "ESG data", "assurance", "taxonomy", "transition plan"], 3, 7) : [],
          frameworksMentioned: isClassified ? randomItems(FRAMEWORKS, 1, 3) : [],
          sectorsMentioned: isClassified ? randomItems(SECTORS, 1, 3) : [],
          geographiesMentioned: isClassified ? randomItems(GEOGRAPHIES, 1, 3) : [],
          targetAudience: isClassified ? randomItem(["C-Suite", "Sustainability Teams", "Finance/Audit", "Board", "General"]) : null,
          aiSummary: isClassified ? `This ${randomItem(CONTENT_TYPES).toLowerCase()} from ${comp.name} examines ${theme.toLowerCase()} trends, focusing on implications for corporate sustainability strategy and regulatory compliance.` : null,
          keyMessagingPoints: isClassified ? [`${comp.name} positions as leader in ${theme.toLowerCase()}`, `Emphasis on practical implementation guidance`, `Cross-references multiple regulatory frameworks`] : [],
          competitivePositioningNotes: isClassified ? `${comp.name} emphasizes its scale and integrated approach to ${theme.toLowerCase()}, differentiating through technology-enabled delivery.` : null,
          confidenceScore: isClassified ? randomFloat(0.72, 0.96) : null,
          aiClassifiedAt: isClassified ? new Date() : null,
          extractedText: `${title}. This publication explores the latest developments in ${theme.toLowerCase()} and their implications for businesses and investors. ${comp.name} provides analysis and recommendations for navigating the evolving sustainability landscape.`,
          wordCount: Math.floor(Math.random() * 5000) + 1000,
        },
      });
      pubCount++;
    }
  }
  console.log(`Seeded ${pubCount} publications`);

  // Seed regulatory events
  for (const event of regulatoryEvents) {
    const publishedDate = randomDate(10);
    await prisma.regulatoryEvent.upsert({
      where: { sourceUrl: event.sourceUrl },
      update: {},
      create: {
        title: event.title,
        description: event.description,
        sourceName: event.sourceName,
        sourceUrl: event.sourceUrl,
        publishedAt: publishedDate,
        geography: event.geography,
        directionOfChange: event.directionOfChange,
        frameworksAffected: event.frameworksAffected,
        impactLevel: event.impactLevel,
        aiSummary: event.aiSummary,
        aiImpactAssessment: event.aiImpactAssessment,
        aiRelevanceToCcass: event.aiRelevanceToCcass,
        confidenceScore: randomFloat(0.82, 0.95),
        aiClassifiedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${regulatoryEvents.length} regulatory events`);

  // Seed headcount snapshots
  let hcCount = 0;
  for (const entry of headcountData) {
    const comp = competitorMap.get(entry.slug);
    if (!comp) continue;

    for (const snap of entry.snapshots) {
      const snapshotDate = new Date();
      snapshotDate.setMonth(snapshotDate.getMonth() - snap.monthsAgo);
      snapshotDate.setDate(1);

      const priorSnap = entry.snapshots.find((s) => s.monthsAgo === snap.monthsAgo + 3);
      const pctChange = priorSnap
        ? Math.round(((snap.total - priorSnap.total) / priorSnap.total) * 10000) / 100
        : null;

      await prisma.headcountSnapshot.upsert({
        where: {
          competitorId_snapshotDate_dataSource: {
            competitorId: comp.id,
            snapshotDate,
            dataSource: "Manual Estimate",
          },
        },
        update: {
          totalSustainabilityHeadcount: snap.total,
          usHeadcount: snap.us,
          ukHeadcount: snap.uk,
          indiaHeadcount: snap.india,
          euHeadcount: snap.eu,
          apacHeadcount: snap.apac,
          pctChangeVsPrior: pctChange,
        },
        create: {
          competitorId: comp.id,
          snapshotDate,
          dataSource: "Manual Estimate",
          totalSustainabilityHeadcount: snap.total,
          usHeadcount: snap.us,
          ukHeadcount: snap.uk,
          indiaHeadcount: snap.india,
          euHeadcount: snap.eu,
          apacHeadcount: snap.apac,
          pctChangeVsPrior: pctChange,
          confidenceLevel: "Medium",
        },
      });
      hcCount++;
    }
  }
  console.log(`Seeded ${hcCount} headcount snapshots`);

  // Seed sustainability talent signals (clear existing to avoid duplicates on re-seed)
  await prisma.layoffEvent.deleteMany({});
  for (const event of talentSignals) {
    const comp = competitorMap.get(event.slug);
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() - event.eventDate);

    await prisma.layoffEvent.create({
      data: {
        competitorId: comp?.id ?? null,
        company: event.company,
        eventDate,
        headcountAffected: event.headcountAffected,
        division: event.division,
        geography: event.geography,
        eventType: event.eventType,
        driver: event.driver,
        sourceName: event.sourceName,
        sourceUrl: event.sourceUrl,
        aiSummary: event.aiSummary,
        confidenceScore: randomFloat(0.75, 0.92),
        aiClassifiedAt: new Date(),
        verified: true,
      },
    });
  }
  console.log(`Seeded ${talentSignals.length} sustainability talent signals`);

  // Seed scraper run history
  for (const comp of competitorRecords) {
    for (let i = 0; i < 5; i++) {
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - i * 2);
      const durationMs = Math.floor(Math.random() * 30000) + 5000;

      await prisma.scraperRun.create({
        data: {
          scraperName: `publications-${comp.slug}`,
          status: i === 0 && Math.random() > 0.8 ? "PARTIAL_SUCCESS" : "SUCCESS",
          itemsFound: Math.floor(Math.random() * 15) + 3,
          itemsNew: Math.floor(Math.random() * 5),
          itemsUpdated: Math.floor(Math.random() * 10),
          startedAt,
          completedAt: new Date(startedAt.getTime() + durationMs),
          durationMs,
        },
      });
    }
  }
  console.log("Seeded scraper run history");

  // Seed AI positioning signals
  for (const signal of aiPositioningSignals) {
    const comp = competitorMap.get(signal.slug);
    if (!comp) continue;

    const publishedAt = new Date();
    publishedAt.setMonth(publishedAt.getMonth() - signal.monthsAgo);

    await prisma.aiPositioningSignal.upsert({
      where: { sourceUrl: signal.sourceUrl },
      update: {},
      create: {
        competitorId: comp.id,
        title: signal.title,
        sourceUrl: signal.sourceUrl,
        sourceName: signal.sourceName,
        publishedAt,
        signalType: signal.signalType,
        aiCapabilityCategory: signal.aiCapabilityCategory,
        sustainabilityDomain: signal.sustainabilityDomain,
        productName: signal.productName,
        partnerName: signal.partnerName,
        partnerType: signal.partnerType,
        partnerships: signal.partnerships ?? undefined,
        maturityLevel: signal.maturityLevel,
        evidenceScore: signal.evidenceScore,
        claimSpecificity: signal.claimSpecificity,
        verifiability: signal.verifiability,
        realityScore: signal.realityScore,
        evidenceIndicators: signal.evidenceIndicators,
        hypeFlagReasons: signal.hypeFlagReasons,
        aiSummary: signal.aiSummary,
        keyClaimsExtracted: signal.keyClaimsExtracted,
        namedClients: signal.namedClients,
        quantitativeMetrics: signal.quantitativeMetrics,
        isSignificant: signal.isSignificant,
        confidenceScore: randomFloat(0.78, 0.95),
        aiClassifiedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${aiPositioningSignals.length} AI positioning signals`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
