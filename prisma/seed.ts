import { PrismaClient, CompetitorCategory } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
    model: "gemini-2.0-flash",
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
    model: "gemini-2.0-flash",
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
    model: "gemini-2.0-flash",
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
    model: "gemini-2.0-pro",
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
      { monthsAgo: 6, total: 2900, us: 820, uk: 620, india: 210, eu: 720, apac: 530 },
      { monthsAgo: 0, total: 3000, us: 850, uk: 640, india: 220, eu: 740, apac: 550 },
    ],
  },
  {
    slug: "wsp",
    snapshots: [
      { monthsAgo: 12, total: 2200, us: 600, uk: 400, india: 100, eu: 600, apac: 500 },
      { monthsAgo: 6, total: 2300, us: 620, uk: 420, india: 110, eu: 620, apac: 530 },
      { monthsAgo: 0, total: 2400, us: 650, uk: 440, india: 120, eu: 640, apac: 550 },
    ],
  },
  {
    slug: "bureau-veritas",
    snapshots: [
      { monthsAgo: 12, total: 1800, us: 400, uk: 300, india: 150, eu: 600, apac: 350 },
      { monthsAgo: 6, total: 1900, us: 420, uk: 310, india: 160, eu: 630, apac: 380 },
      { monthsAgo: 0, total: 2000, us: 440, uk: 320, india: 170, eu: 660, apac: 410 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Layoff / hiring events
// ---------------------------------------------------------------------------

const layoffEvents = [
  {
    company: "Deloitte",
    slug: "deloitte",
    eventType: "Layoff",
    eventDate: 10, // months ago
    headcountAffected: 200,
    division: "Sustainability & Climate Advisory",
    geography: "US",
    driver: "Restructuring",
    sourceName: "Financial Times",
    sourceUrl: "https://ft.com/deloitte-sustainability-layoffs-2025",
    aiSummary: "Deloitte laid off approximately 200 staff from its US sustainability practice as part of a broader restructuring. The cuts primarily affected junior to mid-level consultants.",
  },
  {
    company: "BCG",
    slug: "bcg",
    eventType: "Layoff",
    eventDate: 8,
    headcountAffected: 50,
    division: "Climate & Sustainability",
    geography: "Global",
    driver: "Market conditions",
    sourceName: "Bloomberg",
    sourceUrl: "https://bloomberg.com/bcg-climate-team-reduction-2025",
    aiSummary: "BCG reduced its dedicated climate practice by ~50 roles globally, consolidating climate expertise into broader industry practices rather than maintaining a standalone team.",
  },
  {
    company: "Accenture",
    slug: "accenture",
    eventType: "Hiring Surge",
    eventDate: 6,
    headcountAffected: 400,
    division: "Sustainability Technology",
    geography: "Global",
    driver: "CSRD demand",
    sourceName: "Reuters",
    sourceUrl: "https://reuters.com/accenture-sustainability-hiring-2025",
    aiSummary: "Accenture announced plans to hire 400+ sustainability technology specialists globally, driven by CSRD implementation demand from European clients.",
  },
  {
    company: "KPMG",
    slug: "kpmg",
    eventType: "Hiring Surge",
    eventDate: 5,
    headcountAffected: 300,
    division: "ESG Assurance",
    geography: "EU",
    driver: "CSRD assurance demand",
    sourceName: "Accountancy Daily",
    sourceUrl: "https://accountancydaily.com/kpmg-esg-assurance-hiring-2025",
    aiSummary: "KPMG expanded its ESG assurance team by 300 across European offices to meet CSRD limited assurance demand, signaling confidence in the regulatory-driven revenue stream.",
  },
  {
    company: "PwC",
    slug: "pwc",
    eventType: "Restructuring",
    eventDate: 4,
    headcountAffected: 150,
    division: "Sustainability & Climate Change",
    geography: "US",
    driver: "Practice reorganization",
    sourceName: "Wall Street Journal",
    sourceUrl: "https://wsj.com/pwc-sustainability-restructuring-2025",
    aiSummary: "PwC restructured its US sustainability practice, moving 150 consultants into industry-aligned teams (financial services, energy, technology) rather than a centralized sustainability group.",
  },
  {
    company: "McKinsey",
    slug: "mckinsey",
    eventType: "Hiring Surge",
    eventDate: 3,
    headcountAffected: 200,
    division: "Sustainability Practice",
    geography: "Global",
    driver: "Client demand",
    sourceName: "McKinsey Careers",
    sourceUrl: "https://mckinsey.com/sustainability-hiring-2025",
    aiSummary: "McKinsey expanded its sustainability practice by 200 consultants globally, with particular focus on climate tech and decarbonization advisory.",
  },
  {
    company: "ERM",
    slug: "erm",
    eventType: "Acquisition",
    eventDate: 2,
    headcountAffected: 100,
    division: "ESG Technology",
    geography: "UK",
    driver: "Capability expansion",
    sourceName: "Environmental Analyst",
    sourceUrl: "https://environment-analyst.com/erm-acquisition-2025",
    aiSummary: "ERM acquired a UK-based ESG data analytics firm, adding approximately 100 specialists to its digital sustainability capabilities.",
  },
  {
    company: "EY",
    slug: "ey",
    eventType: "Hiring Surge",
    eventDate: 1,
    headcountAffected: 350,
    division: "CCaSS Practice",
    geography: "Global",
    driver: "CSRD and ISSB demand",
    sourceName: "EY Press Release",
    sourceUrl: "https://ey.com/ccass-expansion-2026",
    aiSummary: "EY announced a global investment to add 350+ sustainability professionals to its CCaSS practice, targeting CSRD implementation and ISSB readiness advisory.",
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

  // Seed AI prompts
  for (const prompt of defaultPrompts) {
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
  console.log(`Seeded ${defaultPrompts.length} AI prompts`);

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
      const url = `https://${comp.website?.replace("https://", "")}/insights/${slug}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`;
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

  // Seed layoff/hiring events
  for (const event of layoffEvents) {
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
  console.log(`Seeded ${layoffEvents.length} layoff/hiring events`);

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
