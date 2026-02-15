/**
 * Database migration script: Fix broken outbound URLs
 *
 * This script updates all broken/fabricated URLs in the live database
 * with verified, working URLs. Run with: npx tsx scripts/fix-broken-urls.ts
 */

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ey_ccass?schema=public";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// URL mappings: old → new
// ---------------------------------------------------------------------------

// Competitor publicationUrls and gtmUrls updates (applied to Competitor table)
const competitorUrlUpdates: Record<
  string,
  { publicationUrls?: string[]; gtmUrls?: string[]; aiPageUrls?: string[] }
> = {
  ey: {
    publicationUrls: [
      "https://www.ey.com/en_gl/services/climate-change-sustainability-services",
      "https://www.ey.com/en_us/sustainability",
      "https://www.ey.com/en_gl/services/assurance/esg-sustainability",
    ],
    aiPageUrls: [
      "https://www.ey.com/en_gl/services/sustainability",
      "https://www.ey.com/en_gl/services/climate-change-sustainability-services",
    ],
  },
  kpmg: {
    gtmUrls: [
      "https://kpmg.com/xx/en/what-we-do/services/ESG.html",
      "https://kpmg.com/xx/en/what-we-do/services/advisory/consulting/kpmg-managed-services/sustainability.html",
    ],
    aiPageUrls: [
      "https://kpmg.com/xx/en/our-insights/ai-and-technology/all-eyes-on-tech-enabled-esg-assurance.html",
    ],
  },
  pwc: {
    aiPageUrls: [
      "https://www.pwc.com/us/en/services/esg/esg-technology.html",
    ],
  },
  deloitte: {
    gtmUrls: [
      "https://www.deloitte.com/global/en/services/consulting-risk/services/sustainability-climate.html",
    ],
    aiPageUrls: [
      "https://www.deloitte.com/global/en/issues/climate/greenspacetech.html",
    ],
  },
  erm: {
    gtmUrls: [
      "https://www.erm.com/about/sustainability/",
      "https://www.erm.com/solutions/data-digital/",
    ],
    aiPageUrls: ["https://www.erm.com/solutions/data-digital/"],
  },
  wsp: {
    gtmUrls: [
      "https://www.wsp.com/en-us/services/sustainability-energy-and-climate-change",
    ],
    aiPageUrls: [
      "https://www.wsp.com/en-gl/hubs/environmental-intelligence",
    ],
  },
  "bureau-veritas": {
    publicationUrls: ["https://group.bureauveritas.com/magazine"],
    gtmUrls: ["https://group.bureauveritas.com/sustainability"],
    aiPageUrls: ["https://group.bureauveritas.com/services-digital-world"],
  },
  bcg: {
    gtmUrls: [
      "https://www.bcg.com/capabilities/climate-change-sustainability/overview",
    ],
    aiPageUrls: [
      "https://www.bcg.com/beyond-consulting/bcg-gamma/co2-ai-for-sustainability",
    ],
  },
  accenture: {
    publicationUrls: [
      "https://www.accenture.com/us-en/insights/consulting/sustainability-index",
    ],
    gtmUrls: ["https://www.accenture.com/us-en/services/sustainability"],
    aiPageUrls: [
      "https://www.accenture.com/us-en/services/sustainability/sustainable-technology",
    ],
  },
  mckinsey: {
    aiPageUrls: [
      "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients",
    ],
  },
};

// Regulatory event sourceUrl updates
const regulatoryUrlUpdates: Record<string, string> = {
  "https://ec.europa.eu/csrd-implementation-2025":
    "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
  "https://www.sec.gov/climate-disclosure-2025-update":
    "https://www.sec.gov/rules-regulations/2024/03/s7-10-22",
  "https://www.ifrs.org/issb-adoption-tracker-2025":
    "https://www.ifrs.org/ifrs-sustainability-disclosure-standards-around-the-world/jurisdictional-guide/",
  "https://ec.europa.eu/csddd-transposition-2025":
    "https://ec.europa.eu/info/business-economy-euro/doing-business-eu/corporate-sustainability-due-diligence_en",
  "https://tnfd.global/adopters-update-2025":
    "https://tnfd.global/engage/tnfd-adopters/",
  "https://ww2.arb.ca.gov/sb253-implementation-2025":
    "https://ww2.arb.ca.gov/our-work/programs/california-corporate-greenhouse-gas-ghg-reporting-and-climate-related-financial",
  "https://www.fca.org.uk/uk-sds-consultation-2025":
    "https://www.gov.uk/government/consultations/exposure-drafts-uk-sustainability-reporting-standards",
  "https://www.sgx.com/climate-reporting-mandate-2025":
    "https://www.sgx.com/sustainable-finance/sustainability-reporting",
  "https://treasury.gov.au/climate-disclosure-mandate-2025":
    "https://treasury.gov.au/consultation/c2024-466491",
  "https://europarl.europa.eu/anti-greenwashing-directive-2025":
    "https://environment.ec.europa.eu/topics/circular-economy-topics/green-claims_en",
};

// AI positioning signal sourceUrl updates
const aiSignalUrlUpdates: Record<string, string> = {
  "https://www.bcg.com/capabilities/climate-change-sustainability/co2-ai":
    "https://www.bcg.com/beyond-consulting/bcg-gamma/co2-ai-for-sustainability",
  "https://www.ey.com/en_gl/services/sustainability/ai-csrd-compliance":
    "https://www.ey.com/en_gl/technical/csrd-technical-resources",
  "https://www.accenture.com/us-en/services/sustainability/green-software":
    "https://www.accenture.com/us-en/services/sustainability/sustainable-technology",
  "https://www.deloitte.com/global/en/services/consulting/deloitte-servicenow-esg":
    "https://www.deloitte.com/global/en/alliances/servicenow.html",
  "https://kpmg.com/xx/en/our-services/advisory/esg/kpmg-esg-hub":
    "https://kpmg.com/xx/en/what-we-do/services/ESG.html",
  "https://www.pwc.com/gx/en/services/sustainability/pwc-google-esg-data":
    "https://www.pwc.com/gx/en/services/alliances/google.html",
  "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients/ai-decarbonization":
    "https://www.mckinsey.com/capabilities/sustainability/how-we-help-clients/decarbonization-transformation",
  "https://www.pwc.com/gx/en/issues/esg/ai-transform-esg-reporting-2030":
    "https://www.pwc.com/gx/en/issues/esg/global-sustainability-reporting-survey.html",
  "https://www.deloitte.com/global/en/issues/climate/ai-sustainability-transformation":
    "https://www.deloitte.com/global/en/issues/climate/powering-ai.html",
  "https://kpmg.com/xx/en/our-insights/esg/responsible-ai-sustainable-future":
    "https://kpmg.com/us/en/articles/2025/ai-sustainability.html",
  "https://www.erm.com/service/digital/ai-environmental-impact":
    "https://www.erm.com/products/",
  "https://www.wsp.com/en-gl/insights/ai-climate-risk-infrastructure":
    "https://www.wsp.com/en-us/services/climate-resilient-infrastructure",
  "https://www.accenture.com/us-en/services/sustainability/salesforce-net-zero-cloud":
    "https://www.accenture.com/us-en/services/salesforce/sustainability",
  "https://www.ey.com/en_gl/alliances/persefoni-carbon-accounting":
    "https://www.ey.com/en_gl/services/sustainability",
  "https://www.bcg.com/capabilities/climate-change-sustainability/ai-supply-chain-deforestation":
    "https://www.bcg.com/capabilities/climate-change-sustainability/insights",
  "https://www.mckinsey.com/capabilities/sustainability/our-insights/ai-climate-action-ceo":
    "https://www.mckinsey.com/capabilities/sustainability/our-insights",
  "https://www.bureauveritas.com/ai-esg-assurance-verification":
    "https://certification.bureauveritas.com/needs/sustainability-report-assurance-and-emissions-verification",
  "https://www.deloitte.com/global/en/about/press-room/greeniq-acquisition":
    "https://www.deloitte.com/global/en/about/press-room/deloitte-launches-global-sustainability-and-climate-business.html",
};

// Talent signal (LayoffEvent) sourceUrl updates
const talentUrlUpdates: Record<string, string> = {
  "https://www.bcg.com/capabilities/climate-change-sustainability":
    "https://www.bcg.com/capabilities/climate-change-sustainability/overview",
  "https://www.erm.com/about/news/erm-completes-acquisition-of-climate-risk-and-energy-transition-consultancy-energetics/":
    "https://www.erm.com/about/news/erm-completes-acquisition-of-climate-risk-and-energy-transition-consultancy-energetics/", // OK
};

// Publication URL base updates (publications use hash-fragment URLs based on competitor publicationUrls[0])
const publicationBaseUrlUpdates: Record<string, string> = {
  "https://www.ey.com/en_gl/insights/sustainability":
    "https://www.ey.com/en_gl/services/climate-change-sustainability-services",
  "https://www.bureauveritas.com/magazine":
    "https://group.bureauveritas.com/magazine",
  "https://www.accenture.com/us-en/insights/sustainability-index":
    "https://www.accenture.com/us-en/insights/consulting/sustainability-index",
};

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Fixing broken URLs in database ===\n");

  // 1. Update competitor URLs
  console.log("1. Updating competitor URLs...");
  for (const [slug, updates] of Object.entries(competitorUrlUpdates)) {
    const data: Record<string, string[]> = {};
    if (updates.publicationUrls) data.publicationUrls = updates.publicationUrls;
    if (updates.gtmUrls) data.gtmUrls = updates.gtmUrls;
    if (updates.aiPageUrls) data.aiPageUrls = updates.aiPageUrls;

    await prisma.competitor.update({
      where: { slug },
      data,
    });
    console.log(`  Updated ${slug}: ${Object.keys(data).join(", ")}`);
  }

  // 2. Update regulatory event URLs
  console.log("\n2. Updating regulatory event URLs...");
  for (const [oldUrl, newUrl] of Object.entries(regulatoryUrlUpdates)) {
    const result = await prisma.regulatoryEvent.updateMany({
      where: { sourceUrl: oldUrl },
      data: { sourceUrl: newUrl },
    });
    if (result.count > 0) {
      console.log(`  Updated ${result.count} regulatory event(s): ${oldUrl.slice(0, 60)}...`);
    }
  }

  // 3. Update AI positioning signal URLs
  console.log("\n3. Updating AI positioning signal URLs...");
  for (const [oldUrl, newUrl] of Object.entries(aiSignalUrlUpdates)) {
    const result = await prisma.aiPositioningSignal.updateMany({
      where: { sourceUrl: oldUrl },
      data: { sourceUrl: newUrl },
    });
    if (result.count > 0) {
      console.log(`  Updated ${result.count} AI signal(s): ${oldUrl.slice(0, 60)}...`);
    }
  }

  // 4. Update talent signal (LayoffEvent) URLs
  console.log("\n4. Updating talent signal URLs...");
  for (const [oldUrl, newUrl] of Object.entries(talentUrlUpdates)) {
    if (oldUrl === newUrl) continue; // Skip if unchanged
    const result = await prisma.layoffEvent.updateMany({
      where: { sourceUrl: oldUrl },
      data: { sourceUrl: newUrl },
    });
    if (result.count > 0) {
      console.log(`  Updated ${result.count} talent signal(s): ${oldUrl.slice(0, 60)}...`);
    }
  }

  // 5. Update publication URLs (these use hash-fragment pattern: baseUrl#slug)
  console.log("\n5. Updating publication base URLs...");
  for (const [oldBase, newBase] of Object.entries(publicationBaseUrlUpdates)) {
    // Find all publications whose URL starts with the old base
    const pubs = await prisma.publication.findMany({
      where: { url: { startsWith: oldBase } },
      select: { id: true, url: true },
    });

    for (const pub of pubs) {
      const newUrl = pub.url.replace(oldBase, newBase);
      await prisma.publication.update({
        where: { id: pub.id },
        data: { url: newUrl },
      });
    }
    if (pubs.length > 0) {
      console.log(`  Updated ${pubs.length} publication(s) with base: ${oldBase.slice(0, 60)}...`);
    }
  }

  // 6. Ensure all headcount snapshots have pctChange calculated
  console.log("\n6. Fixing missing pctChange on headcount snapshots...");
  const competitors = await prisma.competitor.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  let fixedCount = 0;
  for (const comp of competitors) {
    const snapshots = await prisma.headcountSnapshot.findMany({
      where: { competitorId: comp.id },
      orderBy: { snapshotDate: "asc" },
      select: {
        id: true,
        snapshotDate: true,
        totalSustainabilityHeadcount: true,
        pctChangeVsPrior: true,
      },
    });

    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i].pctChangeVsPrior === null) {
        const prior = snapshots[i - 1].totalSustainabilityHeadcount ?? 0;
        const current = snapshots[i].totalSustainabilityHeadcount ?? 0;
        if (prior > 0) {
          const pctChange =
            Math.round(((current - prior) / prior) * 10000) / 100;
          await prisma.headcountSnapshot.update({
            where: { id: snapshots[i].id },
            data: { pctChangeVsPrior: pctChange },
          });
          fixedCount++;
        }
      }
    }
  }
  console.log(`  Fixed ${fixedCount} headcount snapshot(s) with missing pctChange`);

  console.log("\n=== URL migration complete ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
