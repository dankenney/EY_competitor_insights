import { PrismaClient, CompetitorCategory } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
    publicationUrls: [
      "https://kpmg.com/xx/en/our-insights/esg.html",
    ],
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
    gtmUrls: [
      "https://www.pwc.com/gx/en/services/sustainability.html",
    ],
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
    publicationUrls: [
      "https://www.erm.com/insights/",
    ],
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
    publicationUrls: [
      "https://www.wsp.com/en-gl/insights",
    ],
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
    publicationUrls: [
      "https://www.bureauveritas.com/magazine",
    ],
    gtmUrls: [
      "https://www.bureauveritas.com/needs/csr-sustainability",
    ],
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

const defaultPrompts = [
  {
    slug: "screen-publication",
    name: "Publication Relevance Screener",
    description: "Quick screening to determine if a publication is relevant to sustainability/ESG competitive intelligence",
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
    description: "Full classification of a sustainability publication into the CCaSS taxonomy",
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
    description: "Classify regulatory events by geography, direction of change, and impact",
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
    description: "Generate monthly competitive intelligence executive briefing",
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
