import { PrismaClient, CompetitorCategory } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ey_ccass?schema=public";
const pool = new pg.Pool({ connectionString });
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
      "https://www.ey.com/en_gl/insights/sustainability",
      "https://www.ey.com/en_us/insights/sustainability",
      "https://www.ey.com/en_gl/insights/assurance/esg-reporting",
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
      "https://kpmg.com/xx/en/our-services/advisory/esg.html",
      "https://kpmg.com/xx/en/our-services/advisory/esg/sustainability-managed-services.html",
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
      "https://www.deloitte.com/global/en/services/risk-advisory/sustainability-climate.html",
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
      "https://www.erm.com/sustainability/",
      "https://www.erm.com/service/digital/",
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
      "https://www.wsp.com/en-gl/services/sustainability-energy-and-climate-change",
    ],
  },
  {
    name: "Bureau Veritas",
    slug: "bureau-veritas",
    shortName: "BV",
    category: "ENGINEERING" as CompetitorCategory,
    website: "https://www.bureauveritas.com",
    brandColor: "#00205B",
    publicationUrls: ["https://www.bureauveritas.com/magazine"],
    gtmUrls: ["https://www.bureauveritas.com/needs/csr-sustainability"],
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
      "https://www.bcg.com/capabilities/climate-change-sustainability",
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
      "https://www.accenture.com/us-en/insights/sustainability-index",
    ],
    gtmUrls: [
      "https://www.accenture.com/us-en/services/sustainability-index",
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
    "EY Global Climate Risk Barometer 2025",
    "How CSRD readiness is reshaping audit and assurance",
    "The CFO's guide to double materiality assessment",
    "Nature-related disclosures: Moving from TNFD to action",
    "Sustainable finance: Bridging the green bond credibility gap",
    "EY ESG Managed Services: Scaling sustainability reporting",
    "AI-powered climate scenario analysis for financial institutions",
    "Biodiversity risk: The next frontier for corporate disclosure",
    "Net zero transition plans: What investors expect in 2026",
    "Carbon border adjustment mechanism: Implications for EU trade",
    "EY Sustainability Workforce of the Future report",
    "How technology is transforming ESG data management",
  ],
  kpmg: [
    "KPMG Survey of Sustainability Reporting 2025",
    "Getting ready for CSRD: A practical implementation guide",
    "The state of ESG assurance: Moving beyond limited assurance",
    "Climate litigation risk: What boards need to know",
    "KPMG ESG Academy: Building sustainability capabilities at scale",
    "Sustainable supply chain due diligence under CSDDD",
    "Green taxonomy alignment: Lessons from early adopters",
    "Digital ESG: How AI is changing sustainability reporting",
    "Scope 3 emissions measurement: Cutting through complexity",
    "KPMG Climate Change and Decarbonization outlook",
  ],
  pwc: [
    "PwC Global Investor Survey 2025: ESG expectations",
    "State of Climate Tech 2025",
    "CSRD implementation: First wave learnings and pitfalls",
    "Biodiversity credits: Market mechanisms for nature",
    "PwC Net Zero Economy Index",
    "Trust in sustainability data: The assurance imperative",
    "Just transition: Managing the social dimension of climate action",
    "Voluntary carbon markets: Quality and integrity frameworks",
    "ESG integration in M&A: Due diligence evolved",
    "The future of sustainable finance regulation",
    "PwC Climate Tech investment trends report",
  ],
  deloitte: [
    "Deloitte CxO Sustainability Survey 2025",
    "Turning point: Climate action and the transformation imperative",
    "CSRD readiness benchmark: How companies are preparing",
    "The green premium: When sustainability drives value creation",
    "Deloitte Climate Check: Consumer sustainability attitudes",
    "Decarbonizing heavy industry: Pathways and investments",
    "Nature positive: From ambition to corporate strategy",
    "Sustainable AI: Managing the environmental footprint of technology",
    "ESG risk integration in financial services",
    "Deloitte Global Resilience Report 2025",
    "Climate adaptation: Building resilience into corporate strategy",
  ],
  mckinsey: [
    "The net-zero transition: What it would cost, what it could bring",
    "Climate risk and response: Physical hazards and socioeconomic impacts",
    "Sustainability in the boardroom: A new era of governance",
    "McKinsey on Climate Change: Quarterly review",
    "The economic transformation: What would change in the net-zero transition",
    "How companies can adapt to climate change",
    "Nature-based solutions: Scaling corporate investment",
    "Decarbonization technology readiness and cost curves",
    "Climate finance: Mobilizing private capital",
    "Sustainability as transformation: Building competitive advantage",
  ],
  bcg: [
    "BCG Climate AI: Accelerating corporate decarbonization",
    "The Green Business Building opportunity",
    "Corporate sustainability transformation: A CEO guide",
    "Biodiversity: The next ESG frontier for business",
    "BCG Carbon Emissions Benchmarking: Industry deep dive",
    "Sustainable supply chains: Beyond tier-1 visibility",
    "Climate adaptation investment: Risk pricing and opportunity",
    "Green hydrogen economics: When will it be competitive?",
    "ESG data and technology landscape: Market map 2025",
    "The circular economy advantage for manufacturers",
  ],
  accenture: [
    "Accenture Sustainability Value Score report",
    "The responsible AI imperative: Sustainability meets technology",
    "Green software engineering: Reducing digital carbon footprint",
    "360-degree sustainability transformation",
    "Uniting technology and sustainability for business reinvention",
    "Supply chain sustainability: Digital twin approaches",
    "The sustainable enterprise: How to embed ESG in operations",
    "Carbon accounting platforms: Technology landscape review",
    "Sustainability data mesh: Enterprise architecture for ESG",
    "Accenture Life Trends 2025: Sustainability edition",
  ],
  erm: [
    "ERM Sustainability Report 2025",
    "PFAS remediation: Emerging approaches and regulatory outlook",
    "Environmental due diligence in private equity transactions",
    "Nature-related risk assessment: Practical frameworks",
    "Climate adaptation engineering for coastal infrastructure",
    "Contaminated land management: Best practices update",
    "Air quality management in the energy transition",
    "ERM Digital: Environmental data analytics platform",
  ],
  wsp: [
    "WSP Global Status of Climate Adaptation 2025",
    "Designing resilient infrastructure for climate change",
    "Net zero buildings: Engineering the built environment",
    "Water scarcity solutions: Engineering perspectives",
    "Renewable energy integration: Grid stability challenges",
    "Circular economy engineering: Waste-to-resource pathways",
    "WSP Climate and Sustainability technical advisory overview",
    "Hydrogen infrastructure readiness assessment",
  ],
  "bureau-veritas": [
    "Bureau Veritas Green Line certification update",
    "ESG assurance: The verification landscape for CSRD",
    "Supply chain sustainability auditing standards",
    "Carbon neutrality verification: Methodology and best practices",
    "Renewable energy certification: Guarantees of origin",
    "BV sustainability data verification services overview",
    "Circular economy product certification frameworks",
  ],
};

// ---------------------------------------------------------------------------
// Regulatory events
// ---------------------------------------------------------------------------

const regulatoryEvents = [
  {
    title: "EU CSRD enters first reporting period for large companies",
    description: "The Corporate Sustainability Reporting Directive (CSRD) officially begins its first reporting period for large public-interest entities with 500+ employees.",
    sourceName: "European Commission",
    sourceUrl: "https://ec.europa.eu/csrd-implementation-2025",
    geography: "EU",
    directionOfChange: "Mandatory",
    frameworksAffected: ["CSRD", "ESRS", "EU Taxonomy"],
    impactLevel: "High",
    aiSummary: "CSRD's first wave is live, requiring ~11,700 large EU companies to report under European Sustainability Reporting Standards (ESRS). This creates massive demand for assurance, data systems, and advisory services.",
    aiImpactAssessment: "Fortune 500 companies with EU operations need dual materiality assessments, new data infrastructure, and limited assurance on sustainability reports.",
    aiRelevanceToCcass: "Direct revenue opportunity for CCaSS assurance, advisory, and managed services lines. Expect 3-5x demand increase for CSRD readiness engagements.",
  },
  {
    title: "SEC Climate Disclosure Rule — litigation and stay update",
    description: "The SEC's climate disclosure rule remains partially stayed pending Eighth Circuit review. Companies prepare for both scenarios.",
    sourceName: "SEC",
    sourceUrl: "https://www.sec.gov/climate-disclosure-2025-update",
    geography: "US",
    directionOfChange: "Pullback/Uncertainty",
    frameworksAffected: ["SEC Climate Rule"],
    impactLevel: "High",
    aiSummary: "The SEC climate disclosure rule faces continued legal challenges. Despite the stay, many large companies are proceeding with voluntary disclosures to meet investor expectations.",
    aiImpactAssessment: "US companies face regulatory uncertainty but investor pressure for climate disclosure remains strong regardless of SEC rule outcome.",
    aiRelevanceToCcass: "Advisory opportunity: help clients prepare for multiple regulatory scenarios. Voluntary disclosure readiness is a near-term revenue driver.",
  },
  {
    title: "ISSB Standards (IFRS S1/S2) adoption expanding globally",
    description: "Multiple jurisdictions announce ISSB adoption timelines. Japan, Australia, and Singapore publish implementation roadmaps.",
    sourceName: "IFRS Foundation",
    sourceUrl: "https://www.ifrs.org/issb-adoption-tracker-2025",
    geography: "Global",
    directionOfChange: "Voluntary to Mandatory",
    frameworksAffected: ["ISSB", "IFRS S1", "IFRS S2"],
    impactLevel: "High",
    aiSummary: "ISSB standards are gaining global traction with 20+ jurisdictions now committed to adoption. This creates a new global baseline for sustainability disclosure.",
    aiImpactAssessment: "Multinational companies need to prepare for ISSB-aligned reporting across multiple jurisdictions simultaneously.",
    aiRelevanceToCcass: "Significant cross-border advisory opportunity. CCaSS can position as the global ISSB implementation partner.",
  },
  {
    title: "EU Corporate Sustainability Due Diligence Directive (CSDDD) implementation begins",
    description: "Member states begin transposing CSDDD into national law, requiring value chain due diligence on human rights and environmental impacts.",
    sourceName: "European Commission",
    sourceUrl: "https://ec.europa.eu/csddd-transposition-2025",
    geography: "EU",
    directionOfChange: "New Regulation",
    frameworksAffected: ["CSDDD", "CSRD"],
    impactLevel: "High",
    aiSummary: "CSDDD requires large companies to conduct environmental and human rights due diligence across their entire value chain. This extends beyond reporting to operational changes.",
    aiImpactAssessment: "Companies need supply chain mapping, risk assessment processes, and grievance mechanisms. Significant operational transformation required.",
    aiRelevanceToCcass: "New service line opportunity: supply chain sustainability due diligence. Cross-sell with existing CSRD advisory work.",
  },
  {
    title: "TNFD recommendations gain momentum with 500+ adopters",
    description: "The Taskforce on Nature-related Financial Disclosures (TNFD) exceeds 500 early adopters globally, signaling market readiness.",
    sourceName: "TNFD",
    sourceUrl: "https://tnfd.global/adopters-update-2025",
    geography: "Global",
    directionOfChange: "Guidance to Mandate",
    frameworksAffected: ["TNFD", "GRI 101 Biodiversity"],
    impactLevel: "Medium",
    aiSummary: "TNFD adoption is accelerating faster than TCFD did at the same stage. Nature-related disclosures are moving from voluntary best practice toward regulatory expectation.",
    aiImpactAssessment: "Companies in high nature-dependency sectors (food, mining, real estate) face growing pressure to assess and disclose nature-related risks.",
    aiRelevanceToCcass: "Early mover advantage for CCaSS in nature/biodiversity advisory. Build capabilities now before mandatory requirements hit.",
  },
  {
    title: "California climate disclosure laws (SB 253, SB 261) implementation update",
    description: "California finalizes implementation timeline for mandatory GHG emissions and climate risk reporting for large companies doing business in the state.",
    sourceName: "California Air Resources Board",
    sourceUrl: "https://ww2.arb.ca.gov/sb253-implementation-2025",
    geography: "US-State",
    directionOfChange: "Mandatory",
    frameworksAffected: ["SB 253", "SB 261"],
    impactLevel: "Medium",
    aiSummary: "California's climate disclosure laws create US-specific reporting obligations independent of the SEC rule. Companies with $1B+ revenue in California must report Scope 1-3 emissions.",
    aiImpactAssessment: "Affects thousands of US companies not currently subject to mandatory climate disclosure. Creates state-level compliance burden.",
    aiRelevanceToCcass: "Strong US advisory opportunity, particularly for companies navigating overlapping federal/state requirements.",
  },
  {
    title: "UK Sustainability Disclosure Standards consultation launched",
    description: "UK FCA launches consultation on UK Sustainability Disclosure Standards (UK SDS) based on ISSB, with proposed 2027 effective date.",
    sourceName: "UK FCA",
    sourceUrl: "https://www.fca.org.uk/uk-sds-consultation-2025",
    geography: "UK",
    directionOfChange: "Guidance to Mandate",
    frameworksAffected: ["UK SDS", "ISSB"],
    impactLevel: "Medium",
    aiSummary: "The UK is aligning with ISSB standards through its own UK SDS framework. Premium-listed companies and large private companies will be in scope.",
    aiImpactAssessment: "UK-headquartered multinationals need to prepare for UK SDS alongside CSRD and ISSB requirements in other jurisdictions.",
    aiRelevanceToCcass: "UK advisory revenue opportunity. Position as cross-jurisdictional compliance advisor for London-listed companies.",
  },
  {
    title: "Singapore launches mandatory climate reporting for listed companies",
    description: "SGX RegCo mandates ISSB-aligned climate disclosures for listed companies starting FY2025, with phased implementation.",
    sourceName: "SGX RegCo",
    sourceUrl: "https://www.sgx.com/climate-reporting-mandate-2025",
    geography: "APAC-Singapore",
    directionOfChange: "Mandatory",
    frameworksAffected: ["ISSB", "SGX Climate"],
    impactLevel: "Medium",
    aiSummary: "Singapore becomes one of the first APAC jurisdictions to mandate ISSB-aligned climate reporting, signaling the direction for the broader region.",
    aiImpactAssessment: "Singapore-listed companies need climate reporting infrastructure. Sets precedent for other APAC markets.",
    aiRelevanceToCcass: "APAC expansion opportunity for CCaSS. Use Singapore mandate as proof point for clients in other APAC markets.",
  },
  {
    title: "Australia mandates climate-related financial disclosures",
    description: "Australia's Treasury Laws Amendment (Financial Market Infrastructure and Other Measures) mandates climate disclosures for large entities from 2025.",
    sourceName: "Australian Treasury",
    sourceUrl: "https://treasury.gov.au/climate-disclosure-mandate-2025",
    geography: "APAC-Australia",
    directionOfChange: "Mandatory",
    frameworksAffected: ["AASB S1", "AASB S2", "ISSB"],
    impactLevel: "Medium",
    aiSummary: "Australia mandates climate-related financial disclosures aligned with ISSB for large entities, with Group 1 entities (revenue >$500M) reporting from FY2025.",
    aiImpactAssessment: "Major Australian corporates and multinationals with Australian operations must implement climate reporting aligned with ISSB standards.",
    aiRelevanceToCcass: "Growing APAC portfolio for CCaSS. Cross-sell with Australian audit and assurance practice.",
  },
  {
    title: "EU Anti-Greenwashing Directive moves to final trilogue",
    description: "European Parliament and Council reach preliminary agreement on rules to substantiate environmental claims, including carbon neutrality claims.",
    sourceName: "European Parliament",
    sourceUrl: "https://europarl.europa.eu/anti-greenwashing-directive-2025",
    geography: "EU",
    directionOfChange: "New Regulation",
    frameworksAffected: ["Green Claims Directive"],
    impactLevel: "Medium",
    aiSummary: "The Anti-Greenwashing Directive will require companies to substantiate environmental claims with scientific evidence and independent verification.",
    aiImpactAssessment: "Companies making sustainability claims in marketing, products, or financial instruments will need verification infrastructure.",
    aiRelevanceToCcass: "New assurance/verification revenue stream. Natural extension of existing ESG assurance capabilities.",
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
      { monthsAgo: 12, total: 5200, us: 1800, uk: 900, india: 800, eu: 1100, apac: 600 },
      { monthsAgo: 9, total: 5400, us: 1850, uk: 920, india: 850, eu: 1150, apac: 630 },
      { monthsAgo: 6, total: 5500, us: 1900, uk: 930, india: 870, eu: 1160, apac: 640 },
      { monthsAgo: 3, total: 5650, us: 1950, uk: 950, india: 900, eu: 1200, apac: 650 },
      { monthsAgo: 0, total: 5800, us: 2000, uk: 970, india: 920, eu: 1240, apac: 670 },
    ],
  },
  {
    slug: "deloitte",
    snapshots: [
      { monthsAgo: 12, total: 6100, us: 2200, uk: 1000, india: 900, eu: 1300, apac: 700 },
      { monthsAgo: 9, total: 6000, us: 2150, uk: 980, india: 900, eu: 1280, apac: 690 },
      { monthsAgo: 6, total: 5900, us: 2100, uk: 960, india: 890, eu: 1270, apac: 680 },
      { monthsAgo: 3, total: 5950, us: 2120, uk: 970, india: 900, eu: 1280, apac: 680 },
      { monthsAgo: 0, total: 6050, us: 2160, uk: 980, india: 920, eu: 1300, apac: 690 },
    ],
  },
  {
    slug: "kpmg",
    snapshots: [
      { monthsAgo: 12, total: 4000, us: 1400, uk: 700, india: 500, eu: 900, apac: 500 },
      { monthsAgo: 9, total: 4100, us: 1430, uk: 720, india: 520, eu: 920, apac: 510 },
      { monthsAgo: 6, total: 4200, us: 1460, uk: 740, india: 540, eu: 940, apac: 520 },
      { monthsAgo: 3, total: 4350, us: 1500, uk: 760, india: 560, eu: 980, apac: 550 },
      { monthsAgo: 0, total: 4500, us: 1550, uk: 780, india: 580, eu: 1020, apac: 570 },
    ],
  },
  {
    slug: "pwc",
    snapshots: [
      { monthsAgo: 12, total: 4800, us: 1700, uk: 850, india: 600, eu: 1050, apac: 600 },
      { monthsAgo: 9, total: 4900, us: 1730, uk: 860, india: 620, eu: 1080, apac: 610 },
      { monthsAgo: 6, total: 5000, us: 1760, uk: 880, india: 640, eu: 1100, apac: 620 },
      { monthsAgo: 3, total: 5100, us: 1800, uk: 900, india: 660, eu: 1110, apac: 630 },
      { monthsAgo: 0, total: 5200, us: 1840, uk: 920, india: 680, eu: 1120, apac: 640 },
    ],
  },
  {
    slug: "mckinsey",
    snapshots: [
      { monthsAgo: 12, total: 1200, us: 500, uk: 200, india: 100, eu: 250, apac: 150 },
      { monthsAgo: 9, total: 1250, us: 520, uk: 210, india: 110, eu: 260, apac: 150 },
      { monthsAgo: 6, total: 1300, us: 540, uk: 220, india: 120, eu: 270, apac: 150 },
      { monthsAgo: 3, total: 1350, us: 560, uk: 230, india: 130, eu: 280, apac: 150 },
      { monthsAgo: 0, total: 1400, us: 580, uk: 240, india: 140, eu: 290, apac: 150 },
    ],
  },
  {
    slug: "bcg",
    snapshots: [
      { monthsAgo: 12, total: 1100, us: 450, uk: 180, india: 80, eu: 240, apac: 150 },
      { monthsAgo: 9, total: 1050, us: 430, uk: 170, india: 75, eu: 230, apac: 145 },
      { monthsAgo: 6, total: 1000, us: 410, uk: 160, india: 70, eu: 220, apac: 140 },
      { monthsAgo: 3, total: 1050, us: 430, uk: 170, india: 75, eu: 230, apac: 145 },
      { monthsAgo: 0, total: 1100, us: 450, uk: 180, india: 80, eu: 240, apac: 150 },
    ],
  },
  {
    slug: "accenture",
    snapshots: [
      { monthsAgo: 12, total: 3500, us: 1200, uk: 500, india: 700, eu: 700, apac: 400 },
      { monthsAgo: 9, total: 3600, us: 1230, uk: 510, india: 720, eu: 720, apac: 420 },
      { monthsAgo: 6, total: 3700, us: 1260, uk: 520, india: 740, eu: 740, apac: 440 },
      { monthsAgo: 3, total: 3800, us: 1290, uk: 530, india: 760, eu: 760, apac: 460 },
      { monthsAgo: 0, total: 3900, us: 1320, uk: 540, india: 780, eu: 780, apac: 480 },
    ],
  },
  {
    slug: "erm",
    snapshots: [
      { monthsAgo: 12, total: 2800, us: 800, uk: 600, india: 200, eu: 700, apac: 500 },
      { monthsAgo: 9, total: 2850, us: 810, uk: 610, india: 205, eu: 710, apac: 515 },
      { monthsAgo: 6, total: 2900, us: 820, uk: 620, india: 210, eu: 720, apac: 530 },
      { monthsAgo: 3, total: 2950, us: 835, uk: 630, india: 215, eu: 730, apac: 540 },
      { monthsAgo: 0, total: 3000, us: 850, uk: 640, india: 220, eu: 740, apac: 550 },
    ],
  },
  {
    slug: "wsp",
    snapshots: [
      { monthsAgo: 12, total: 2200, us: 600, uk: 400, india: 100, eu: 600, apac: 500 },
      { monthsAgo: 9, total: 2250, us: 610, uk: 410, india: 105, eu: 610, apac: 515 },
      { monthsAgo: 6, total: 2300, us: 620, uk: 420, india: 110, eu: 620, apac: 530 },
      { monthsAgo: 3, total: 2350, us: 635, uk: 430, india: 115, eu: 630, apac: 540 },
      { monthsAgo: 0, total: 2400, us: 650, uk: 440, india: 120, eu: 640, apac: 550 },
    ],
  },
  {
    slug: "bureau-veritas",
    snapshots: [
      { monthsAgo: 12, total: 1800, us: 400, uk: 300, india: 150, eu: 600, apac: 350 },
      { monthsAgo: 9, total: 1850, us: 410, uk: 305, india: 155, eu: 615, apac: 365 },
      { monthsAgo: 6, total: 1900, us: 420, uk: 310, india: 160, eu: 630, apac: 380 },
      { monthsAgo: 3, total: 1950, us: 430, uk: 315, india: 165, eu: 645, apac: 395 },
      { monthsAgo: 0, total: 2000, us: 440, uk: 320, india: 170, eu: 660, apac: 410 },
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
    company: "BCG",
    slug: "bcg",
    eventType: "Practice Restructuring",
    eventDate: 8, // months ago
    headcountAffected: 50,
    division: "Climate & Sustainability Practice",
    geography: "Global",
    driver: "Practice consolidation",
    sourceName: "BCG",
    sourceUrl: "https://www.bcg.com/capabilities/climate-change-sustainability",
    aiSummary: "BCG dissolved its standalone Climate & Sustainability practice, redistributing ~50 sustainability specialists into industry verticals (energy, industrials, financial institutions). Signals a shift from dedicated ESG teams to embedded sustainability expertise.",
  },
  {
    company: "PwC",
    slug: "pwc",
    eventType: "Practice Restructuring",
    eventDate: 4,
    headcountAffected: null,
    division: "Sustainability & Climate Change",
    geography: "US",
    driver: "Practice reorganization",
    sourceName: "PwC",
    sourceUrl: "https://www.pwc.com/us/en/services/esg.html",
    aiSummary: "PwC reorganized its US sustainability practice from a centralized group into industry-aligned teams. Sustainability partners now report to industry sector leaders rather than a dedicated sustainability practice lead.",
  },
  {
    company: "Deloitte",
    slug: "deloitte",
    eventType: "Leadership Move",
    eventDate: 6,
    headcountAffected: null,
    division: "Global Sustainability & Climate",
    geography: "Global",
    driver: "Leadership appointment",
    sourceName: "PR Newswire",
    sourceUrl: "https://www.prnewswire.com/news-releases/deloitte-announces-1-billion-investment-in-global-sustainability--climate-practice-301524788.html",
    aiSummary: "Deloitte appointed a new Global Sustainability & Climate practice leader, elevating the role to report directly to the Global CEO. Signals increased strategic priority for sustainability services at the firm level.",
  },
  {
    company: "ERM",
    slug: "erm",
    eventType: "ESG Acquisition",
    eventDate: 2,
    headcountAffected: 100,
    division: "ESG Data & Technology",
    geography: "UK",
    driver: "Capability expansion",
    sourceName: "ERM",
    sourceUrl: "https://www.erm.com/about/news/erm-completes-acquisition-of-climate-risk-and-energy-transition-consultancy-energetics/",
    aiSummary: "ERM acquired a UK-based ESG data analytics firm, adding ~100 sustainability data specialists. Strengthens ERM's digital sustainability capabilities and positions them to compete with Big Four on CSRD technology solutions.",
  },
  {
    company: "McKinsey",
    slug: "mckinsey",
    eventType: "Leadership Move",
    eventDate: 3,
    headcountAffected: null,
    division: "McKinsey Sustainability",
    geography: "Global",
    driver: "Practice expansion",
    sourceName: "McKinsey",
    sourceUrl: "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients",
    aiSummary: "McKinsey elevated its sustainability practice to a full capability (alongside Strategy, Operations, etc.), appointing a senior partner as global head. Previously operated as a cross-cutting initiative rather than a standalone practice.",
  },
  {
    company: "EY",
    slug: "ey",
    eventType: "Practice Expansion",
    eventDate: 1,
    headcountAffected: 350,
    division: "CCaSS Practice",
    geography: "Global",
    driver: "CSRD and ISSB demand",
    sourceName: "EY",
    sourceUrl: "https://www.ey.com/en_gl/services/sustainability",
    aiSummary: "EY announced a dedicated investment to expand its CCaSS practice by 350+ sustainability professionals globally, with specific focus on CSRD implementation, ISSB readiness, and ESG assurance delivery. Hiring concentrated in EU and APAC.",
  },
];

// ---------------------------------------------------------------------------
// AI Positioning seed data
// ---------------------------------------------------------------------------

const aiPageUrlsBySlug: Record<string, string[]> = {
  ey: [
    "https://www.ey.com/en_gl/services/sustainability/ai-sustainability",
    "https://www.ey.com/en_gl/ai/sustainability",
  ],
  kpmg: [
    "https://kpmg.com/xx/en/our-services/advisory/esg/esg-technology.html",
  ],
  pwc: [
    "https://www.pwc.com/gx/en/services/sustainability/esg-technology.html",
  ],
  deloitte: [
    "https://www.deloitte.com/global/en/services/consulting/sustainability-technology.html",
  ],
  erm: [
    "https://www.erm.com/service/digital/",
  ],
  wsp: [
    "https://www.wsp.com/en-gl/services/digital-environment",
  ],
  "bureau-veritas": [
    "https://www.bureauveritas.com/digital-trust",
  ],
  mckinsey: [
    "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients/ai-for-sustainability",
  ],
  bcg: [
    "https://www.bcg.com/capabilities/climate-change-sustainability/ai-sustainability",
  ],
  accenture: [
    "https://www.accenture.com/us-en/services/sustainability/ai-sustainability",
  ],
};

const aiPositioningSignals = [
  // HIGH REALITY — deployed, named clients, metrics
  {
    slug: "bcg",
    title: "BCG CO2 AI Platform: Multi-Enterprise Carbon Management at Scale",
    sourceUrl: "https://www.bcg.com/capabilities/climate-change-sustainability/co2-ai",
    sourceName: "BCG",
    signalType: "Product Launch",
    aiCapabilityCategory: "Carbon Accounting & Emissions Management",
    sustainabilityDomain: "Climate & Decarbonization",
    productName: "CO2 AI by BCG",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Scaled",
    evidenceScore: 0.92,
    claimSpecificity: 0.88,
    verifiability: 0.85,
    realityScore: 0.90,
    evidenceIndicators: ["Named platform (CO2 AI)", "500+ enterprise users reported", "Publicly verifiable tool", "Independent media coverage"],
    hypeFlagReasons: [],
    aiSummary: "BCG's CO2 AI is a SaaS platform enabling enterprises to measure, simulate, and reduce Scope 1-3 emissions. Deployed at scale with 500+ enterprises. One of the most concrete AI-sustainability products in the market.",
    keyClaimsExtracted: ["500+ enterprises using the platform", "Scope 1-3 emissions measurement", "AI-powered simulation of reduction scenarios", "Available as standalone SaaS"],
    namedClients: ["Henkel", "Holcim"],
    quantitativeMetrics: ["500+ enterprise users", "35% average reduction in reporting time"],
    isSignificant: true,
    monthsAgo: 3,
  },
  {
    slug: "ey",
    title: "EY.ai Sustainability Suite: AI-Powered CSRD Compliance Automation",
    sourceUrl: "https://www.ey.com/en_gl/services/sustainability/ai-csrd-compliance",
    sourceName: "EY",
    signalType: "Platform Update",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "EY.ai Sustainability Suite",
    partnerName: "Microsoft",
    partnerType: "Technology",
    partnerships: [{ name: "Microsoft", type: "Technology", depth: "Deep integration", announced: "2025-06" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.82,
    claimSpecificity: 0.78,
    verifiability: 0.72,
    realityScore: 0.79,
    evidenceIndicators: ["Named product suite", "Microsoft partnership", "CSRD-specific use case", "Multiple client references"],
    hypeFlagReasons: [],
    aiSummary: "EY launched the EY.ai Sustainability Suite for automated CSRD double materiality assessments, data collection, and ESRS-aligned report generation. Built on Microsoft Azure AI. Multiple client pilots reported.",
    keyClaimsExtracted: ["Automated double materiality assessment", "ESRS-aligned report generation", "Built on Microsoft Azure AI", "50% reduction in data collection time"],
    namedClients: ["Siemens", "Unilever"],
    quantitativeMetrics: ["50% data collection time reduction", "12 ESRS standards covered"],
    isSignificant: true,
    monthsAgo: 2,
  },
  {
    slug: "accenture",
    title: "Accenture Green Software Foundation: Measuring and Reducing Digital Carbon",
    sourceUrl: "https://www.accenture.com/us-en/services/sustainability/green-software",
    sourceName: "Accenture",
    signalType: "Client Win / Case Study",
    aiCapabilityCategory: "Carbon Accounting & Emissions Management",
    sustainabilityDomain: "Climate & Decarbonization",
    productName: "Green Software Dashboard",
    partnerName: "Green Software Foundation",
    partnerType: "Industry",
    partnerships: [{ name: "Green Software Foundation", type: "Industry", depth: "Founding member", announced: "2024-01" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.80,
    claimSpecificity: 0.82,
    verifiability: 0.78,
    realityScore: 0.80,
    evidenceIndicators: ["Founding member of GSF", "Named client deployments", "Open-source contributions", "Measurable outcomes"],
    hypeFlagReasons: [],
    aiSummary: "Accenture, as a founding member of the Green Software Foundation, has deployed green software measurement tools for clients. Real deployments with measurable carbon reduction outcomes from software optimization.",
    keyClaimsExtracted: ["Founding member of Green Software Foundation", "Software carbon intensity measurement", "Client deployments in financial services"],
    namedClients: ["Deutsche Bank"],
    quantitativeMetrics: ["30% reduction in cloud carbon emissions for key clients"],
    isSignificant: true,
    monthsAgo: 4,
  },

  // MEDIUM REALITY — partnerships with specifics, pilot stage
  {
    slug: "deloitte",
    title: "Deloitte-ServiceNow ESG Management Platform Integration",
    sourceUrl: "https://www.deloitte.com/global/en/services/consulting/deloitte-servicenow-esg",
    sourceName: "Deloitte",
    signalType: "Partnership Announcement",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: null,
    partnerName: "ServiceNow",
    partnerType: "Technology",
    partnerships: [{ name: "ServiceNow", type: "Technology", depth: "Joint solution", announced: "2025-03" }],
    maturityLevel: "Pilot",
    evidenceScore: 0.55,
    claimSpecificity: 0.62,
    verifiability: 0.50,
    realityScore: 0.56,
    evidenceIndicators: ["Named technology partner", "Joint press release", "Specific platform integration"],
    hypeFlagReasons: ["No named client deployments yet", "Pilot stage only"],
    aiSummary: "Deloitte announced a partnership with ServiceNow to integrate ESG data management into the Now Platform. AI-powered data collection and automated ESG workflows. Currently in pilot with select clients.",
    keyClaimsExtracted: ["ServiceNow platform integration", "AI-powered ESG data workflows", "Automated reporting pipelines"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 5,
  },
  {
    slug: "kpmg",
    title: "KPMG ESG Data & Analytics Hub: AI-Driven Regulatory Mapping",
    sourceUrl: "https://kpmg.com/xx/en/our-services/advisory/esg/kpmg-esg-hub",
    sourceName: "KPMG",
    signalType: "Product Launch",
    aiCapabilityCategory: "Regulatory Intelligence & Compliance",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "KPMG ESG Hub",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Pilot",
    evidenceScore: 0.50,
    claimSpecificity: 0.58,
    verifiability: 0.42,
    realityScore: 0.51,
    evidenceIndicators: ["Named product", "Specific regulatory mapping use case"],
    hypeFlagReasons: ["Limited external validation", "No client metrics shared"],
    aiSummary: "KPMG launched the ESG Data & Analytics Hub, an AI-powered platform for mapping ESG regulations across jurisdictions and automating compliance gap analysis. In pilot with a handful of clients.",
    keyClaimsExtracted: ["Multi-jurisdictional regulatory mapping", "Automated compliance gap analysis", "AI-powered data extraction"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 6,
  },
  {
    slug: "pwc",
    title: "PwC-Google Cloud ESG Data Engine Partnership",
    sourceUrl: "https://www.pwc.com/gx/en/services/sustainability/pwc-google-esg-data",
    sourceName: "PwC",
    signalType: "Partnership Announcement",
    aiCapabilityCategory: "ESG Data Analytics & Reporting",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: null,
    partnerName: "Google Cloud",
    partnerType: "Technology",
    partnerships: [{ name: "Google Cloud", type: "Technology", depth: "Alliance", announced: "2025-01" }],
    maturityLevel: "Pilot",
    evidenceScore: 0.52,
    claimSpecificity: 0.55,
    verifiability: 0.48,
    realityScore: 0.52,
    evidenceIndicators: ["Named technology partner", "Specific data platform use case"],
    hypeFlagReasons: ["Alliance-level only", "No deployed clients mentioned"],
    aiSummary: "PwC partnered with Google Cloud to develop an ESG data engine leveraging BigQuery and Vertex AI for automated sustainability data ingestion, validation, and analysis. Alliance stage with pilot clients.",
    keyClaimsExtracted: ["Google Cloud Vertex AI integration", "Automated ESG data validation", "BigQuery-based analytics"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 8,
  },
  {
    slug: "mckinsey",
    title: "McKinsey Sustainability Lighthouse: AI for Decarbonization Pathways",
    sourceUrl: "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients/ai-decarbonization",
    sourceName: "McKinsey",
    signalType: "Internal Capability",
    aiCapabilityCategory: "Climate Modeling & Scenario Analysis",
    sustainabilityDomain: "Climate & Decarbonization",
    productName: "Sustainability Lighthouse",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.68,
    claimSpecificity: 0.70,
    verifiability: 0.55,
    realityScore: 0.66,
    evidenceIndicators: ["Named internal tool", "Referenced in multiple published case studies", "Used in engagement delivery"],
    hypeFlagReasons: ["Not externally accessible", "Primarily consulting-embedded"],
    aiSummary: "McKinsey uses the Sustainability Lighthouse, an internal AI-powered analytics suite, for client decarbonization pathway modeling. Provides sector-specific marginal abatement cost curves and scenario analysis. Used in engagements but not sold as standalone product.",
    keyClaimsExtracted: ["AI-powered decarbonization modeling", "Marginal abatement cost curves", "Sector-specific scenario analysis"],
    namedClients: [],
    quantitativeMetrics: ["Used in 200+ sustainability engagements"],
    isSignificant: true,
    monthsAgo: 1,
  },

  // LOW REALITY — vague claims, thought leadership, buzzwords
  {
    slug: "pwc",
    title: "PwC: How AI Will Transform ESG Reporting — A Vision for 2030",
    sourceUrl: "https://www.pwc.com/gx/en/issues/esg/ai-transform-esg-reporting-2030",
    sourceName: "PwC",
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
    monthsAgo: 7,
  },
  {
    slug: "deloitte",
    title: "Deloitte: AI-Powered Sustainability Transformation — Reimagining the Possible",
    sourceUrl: "https://www.deloitte.com/global/en/issues/climate/ai-sustainability-transformation",
    sourceName: "Deloitte",
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
    aiSummary: "Generic thought leadership from Deloitte using 'AI-powered sustainability transformation' framing with no specific products, tools, or measurable client outcomes. Typical press release theatre.",
    keyClaimsExtracted: ["AI-powered end-to-end sustainability transformation", "Proprietary AI models"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 9,
  },
  {
    slug: "kpmg",
    title: "KPMG: Responsible AI for a Sustainable Future — Thought Leadership Series",
    sourceUrl: "https://kpmg.com/xx/en/our-insights/esg/responsible-ai-sustainable-future",
    sourceName: "KPMG",
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
    aiSummary: "KPMG thought leadership series on responsible AI and sustainability. General discussion of AI ethics in ESG context. No specific tools, products, or client examples. Positions KPMG as 'thinking about the problem' rather than solving it.",
    keyClaimsExtracted: ["Responsible AI framework for ESG", "AI governance for sustainability"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 10,
  },

  // MORE MIXED SIGNALS
  {
    slug: "erm",
    title: "ERM Digital: AI-Enhanced Environmental Impact Assessment Platform",
    sourceUrl: "https://www.erm.com/service/digital/ai-environmental-impact",
    sourceName: "ERM",
    signalType: "Platform Update",
    aiCapabilityCategory: "Biodiversity & Nature Analytics",
    sustainabilityDomain: "Nature & Biodiversity",
    productName: "ERM Intelligence",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.72,
    claimSpecificity: 0.68,
    verifiability: 0.60,
    realityScore: 0.69,
    evidenceIndicators: ["Named platform", "Specific EIA use case", "Engineering domain expertise"],
    hypeFlagReasons: ["Limited public metrics"],
    aiSummary: "ERM launched AI-enhanced environmental impact assessment capabilities within its digital platform. Uses NLP to analyze environmental baseline data and predict ecological impacts. Deployed with mining and energy clients.",
    keyClaimsExtracted: ["NLP-powered environmental baseline analysis", "Predictive ecological impact modeling"],
    namedClients: [],
    quantitativeMetrics: ["40% faster EIA turnaround"],
    isSignificant: true,
    monthsAgo: 2,
  },
  {
    slug: "wsp",
    title: "WSP Launches AI-Powered Climate Risk Analytics for Infrastructure",
    sourceUrl: "https://www.wsp.com/en-gl/insights/ai-climate-risk-infrastructure",
    sourceName: "WSP",
    signalType: "Product Launch",
    aiCapabilityCategory: "Climate Modeling & Scenario Analysis",
    sustainabilityDomain: "Climate & Decarbonization",
    productName: "WSP Climate Intelligence",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Pilot",
    evidenceScore: 0.55,
    claimSpecificity: 0.60,
    verifiability: 0.48,
    realityScore: 0.55,
    evidenceIndicators: ["Named product", "Infrastructure-specific use case"],
    hypeFlagReasons: ["Pilot stage", "No public client references"],
    aiSummary: "WSP announced its Climate Intelligence platform for physical climate risk assessment of infrastructure assets. Uses AI to integrate climate models with asset vulnerability data. In pilot with transport and water utilities.",
    keyClaimsExtracted: ["Physical climate risk for infrastructure", "AI-integrated climate models", "Asset vulnerability scoring"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 3,
  },
  {
    slug: "accenture",
    title: "Accenture-SalesForce Net Zero Cloud AI Enhancement",
    sourceUrl: "https://www.accenture.com/us-en/services/sustainability/salesforce-net-zero-cloud",
    sourceName: "Accenture",
    signalType: "Partnership Announcement",
    aiCapabilityCategory: "Carbon Accounting & Emissions Management",
    sustainabilityDomain: "Climate & Decarbonization",
    productName: null,
    partnerName: "Salesforce",
    partnerType: "Technology",
    partnerships: [{ name: "Salesforce", type: "Technology", depth: "Joint solution", announced: "2025-04" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.70,
    claimSpecificity: 0.72,
    verifiability: 0.65,
    realityScore: 0.70,
    evidenceIndicators: ["Named partner platform", "Specific product integration", "Deployed solution"],
    hypeFlagReasons: [],
    aiSummary: "Accenture enhanced Salesforce Net Zero Cloud with AI-powered emissions factor matching and automated Scope 3 calculations. Multiple client deployments in consumer goods and retail sectors.",
    keyClaimsExtracted: ["AI emissions factor matching", "Automated Scope 3 calculations", "Salesforce Net Zero Cloud integration"],
    namedClients: [],
    quantitativeMetrics: ["60% reduction in Scope 3 data collection effort"],
    isSignificant: true,
    monthsAgo: 4,
  },
  {
    slug: "ey",
    title: "EY-Persefoni Partnership: AI Carbon Accounting for Financial Services",
    sourceUrl: "https://www.ey.com/en_gl/alliances/persefoni-carbon-accounting",
    sourceName: "EY",
    signalType: "Partnership Announcement",
    aiCapabilityCategory: "Carbon Accounting & Emissions Management",
    sustainabilityDomain: "Sustainable Finance",
    productName: null,
    partnerName: "Persefoni",
    partnerType: "Technology",
    partnerships: [{ name: "Persefoni", type: "Technology", depth: "Alliance", announced: "2025-02" }],
    maturityLevel: "Deployed",
    evidenceScore: 0.75,
    claimSpecificity: 0.72,
    verifiability: 0.68,
    realityScore: 0.73,
    evidenceIndicators: ["Named fintech partner", "Financial services focus", "Deployed with clients"],
    hypeFlagReasons: [],
    aiSummary: "EY partnered with Persefoni to offer AI-powered carbon accounting specifically for financial institutions. Combines Persefoni's PCAF-aligned platform with EY's assurance expertise. Deployed with asset managers and banks.",
    keyClaimsExtracted: ["PCAF-aligned carbon accounting", "Financial services specialization", "AI-powered financed emissions calculation"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: true,
    monthsAgo: 6,
  },
  {
    slug: "bcg",
    title: "BCG Gamma x Sustainability: AI for Supply Chain Deforestation Monitoring",
    sourceUrl: "https://www.bcg.com/capabilities/climate-change-sustainability/ai-supply-chain-deforestation",
    sourceName: "BCG",
    signalType: "Client Win / Case Study",
    aiCapabilityCategory: "Supply Chain Traceability & Due Diligence",
    sustainabilityDomain: "Nature & Biodiversity",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Deployed",
    evidenceScore: 0.78,
    claimSpecificity: 0.80,
    verifiability: 0.62,
    realityScore: 0.75,
    evidenceIndicators: ["Named BCG Gamma involvement", "Satellite imagery analysis", "Specific use case"],
    hypeFlagReasons: ["Client name not disclosed"],
    aiSummary: "BCG Gamma developed an AI-powered supply chain deforestation monitoring tool using satellite imagery and NLP analysis of supplier data. Deployed with a major FMCG company for EUDR compliance.",
    keyClaimsExtracted: ["Satellite imagery analysis for deforestation", "EUDR compliance tool", "Real-time supply chain monitoring"],
    namedClients: [],
    quantitativeMetrics: ["90% accuracy in deforestation detection"],
    isSignificant: true,
    monthsAgo: 1,
  },
  {
    slug: "mckinsey",
    title: "McKinsey: The Promise and Peril of AI in Climate Action — A CEO Perspective",
    sourceUrl: "https://www.mckinsey.com/capabilities/sustainability/our-insights/ai-climate-action-ceo",
    sourceName: "McKinsey",
    signalType: "Thought Leadership",
    aiCapabilityCategory: "General AI & Sustainability Strategy",
    sustainabilityDomain: "Cross-Domain",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Announced",
    evidenceScore: 0.22,
    claimSpecificity: 0.28,
    verifiability: 0.20,
    realityScore: 0.24,
    evidenceIndicators: [],
    hypeFlagReasons: ["Thought leadership only", "General observations", "No specific McKinsey tools"],
    aiSummary: "McKinsey thought leadership on AI's role in climate action. High-level survey of opportunities and risks. Well-researched but does not describe specific McKinsey capabilities or products.",
    keyClaimsExtracted: ["AI could accelerate decarbonization by 5-10%", "Risk of AI increasing energy consumption"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 5,
  },
  {
    slug: "bureau-veritas",
    title: "Bureau Veritas: AI-Enhanced ESG Assurance Verification",
    sourceUrl: "https://www.bureauveritas.com/ai-esg-assurance-verification",
    sourceName: "Bureau Veritas",
    signalType: "Internal Capability",
    aiCapabilityCategory: "Sustainability Assurance Automation",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: null,
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Pilot",
    evidenceScore: 0.45,
    claimSpecificity: 0.50,
    verifiability: 0.38,
    realityScore: 0.45,
    evidenceIndicators: ["Specific assurance use case", "Testing automation claims"],
    hypeFlagReasons: ["No named product", "Pilot only", "Limited public information"],
    aiSummary: "Bureau Veritas is piloting AI-enhanced ESG assurance processes for automated document review and data consistency checking. Early stage with no public metrics or named clients.",
    keyClaimsExtracted: ["AI document review for assurance", "Data consistency checking", "Automated evidence gathering"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: false,
    monthsAgo: 3,
  },
  {
    slug: "deloitte",
    title: "Deloitte Acquires AI Sustainability Analytics Startup GreenIQ",
    sourceUrl: "https://www.deloitte.com/global/en/about/press-room/greeniq-acquisition",
    sourceName: "Deloitte",
    signalType: "Acquisition",
    aiCapabilityCategory: "Greenwashing Detection & Claims Verification",
    sustainabilityDomain: "ESG Reporting & Disclosure",
    productName: "GreenIQ",
    partnerName: null,
    partnerType: null,
    partnerships: null,
    maturityLevel: "Pilot",
    evidenceScore: 0.60,
    claimSpecificity: 0.65,
    verifiability: 0.55,
    realityScore: 0.60,
    evidenceIndicators: ["Named acquisition", "Specific product capabilities", "Integration announced"],
    hypeFlagReasons: ["Integration still in progress", "Pre-acquisition track record uncertain"],
    aiSummary: "Deloitte acquired GreenIQ, an AI startup specializing in greenwashing detection and ESG claims verification. The technology uses NLP to cross-reference sustainability claims against evidence. Integration into Deloitte's assurance practice is underway.",
    keyClaimsExtracted: ["Greenwashing detection AI", "NLP cross-referencing of claims", "Integration with Deloitte assurance"],
    namedClients: [],
    quantitativeMetrics: [],
    isSignificant: true,
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
        update: {},
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
