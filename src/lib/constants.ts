// Competitor categories
export const COMPETITOR_CATEGORIES = {
  BIG4: "Big Four",
  MBB: "MBB (Strategy)",
  ENGINEERING: "Engineering & Environment",
  SELF: "Self (Benchmarking)",
} as const;

export type CompetitorCategory = keyof typeof COMPETITOR_CATEGORIES;

// Publication theme taxonomy (from the CCaSS deck)
export const PUBLICATION_THEMES = [
  "Climate change and biodiversity",
  "ESG reporting and regulations",
  "ESG Managed Services",
  "Sustainable finance",
  "Climate tech",
] as const;

export type PublicationTheme = (typeof PUBLICATION_THEMES)[number];

// Publication content types
export const CONTENT_TYPES = [
  "Thought Leadership",
  "Article",
  "Report",
  "Video",
  "Webinar",
  "Podcast",
  "Blog Post",
  "Whitepaper",
  "Case Study",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

// Regulatory jurisdictions
export const JURISDICTIONS = [
  "US",
  "US-State",
  "Canada",
  "EU",
  "UK",
  "China",
  "APAC-Australia",
  "APAC-HongKong",
  "APAC-Singapore",
  "APAC-Japan",
  "Global",
] as const;

export type Jurisdiction = (typeof JURISDICTIONS)[number];

// Regulatory direction of change
export const DIRECTION_OF_CHANGE = [
  "Pullback/Uncertainty",
  "Paused",
  "Mandatory",
  "Optimised Regulations",
  "Refinement & Convergence",
  "Guidance to Mandate",
  "Voluntary to Mandatory",
  "New Regulation",
] as const;

export type DirectionOfChange = (typeof DIRECTION_OF_CHANGE)[number];

// Impact levels
export const IMPACT_LEVELS = ["High", "Medium", "Low"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

// Competitor brand colors (for charts)
export const COMPETITOR_COLORS: Record<string, string> = {
  ey: "#FFE600",
  kpmg: "#00338D",
  pwc: "#EB8C00",
  deloitte: "#86BC25",
  erm: "#00A3E0",
  wsp: "#E31937",
  "bureau-veritas": "#00205B",
  mckinsey: "#004B87",
  bcg: "#00843D",
  accenture: "#A100FF",
};

// EY brand colors
export const EY_COLORS = {
  yellow: "#FFE600",
  dark: "#2E2E38",
  grayDark: "#464646",
  grayMedium: "#747480",
  grayLight: "#C4C4CD",
  white: "#FFFFFF",
} as const;

// Navigation items for the sidebar
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Regulatory", href: "/regulatory", icon: "Scale" },
  { label: "Publications", href: "/publications", icon: "FileText" },
  { label: "Competitors", href: "/competitors", icon: "Users" },
  { label: "Headcount", href: "/headcount", icon: "BarChart3" },
  { label: "GTM Messaging", href: "/gtm", icon: "Target" },
  { label: "Client Sentiment", href: "/sentiment", icon: "TrendingUp" },
  { label: "Intelligence Q&A", href: "/chat", icon: "MessageSquare" },
  { label: "Reports", href: "/reports", icon: "Download" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Scraper Health", href: "/admin/scrapers", icon: "Activity" },
  { label: "AI Prompts", href: "/admin/prompts", icon: "Sparkles" },
  { label: "Users", href: "/admin/users", icon: "UserCog" },
] as const;

// Gemini model configuration
export const AI_MODELS = {
  screening: "gemini-2.0-flash",
  classification: "gemini-2.0-flash",
  synthesis: "gemini-2.0-pro",
  embedding: "text-embedding-004",
} as const;

// Embedding dimensions
export const EMBEDDING_DIMENSIONS = 768;
