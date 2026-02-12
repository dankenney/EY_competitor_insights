import Link from "next/link";
import {
  Scale,
  FileText,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModuleCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  metric: string;
  metricLabel: string;
  status: "active" | "coming-soon";
}

const modules: ModuleCard[] = [
  {
    title: "Regulatory Tracker",
    description:
      "Monitor global ESG regulations, directives, and policy shifts across jurisdictions.",
    href: "/regulatory",
    icon: Scale,
    metric: "--",
    metricLabel: "Active regulations",
    status: "active",
  },
  {
    title: "Publications & Thought Leadership",
    description:
      "Track competitor publications, reports, and content output across sustainability topics.",
    href: "/publications",
    icon: FileText,
    metric: "--",
    metricLabel: "Publications tracked",
    status: "active",
  },
  {
    title: "Headcount Intelligence",
    description:
      "Analyze competitor hiring trends, team sizes, and talent movements in ESG practice areas.",
    href: "/headcount",
    icon: BarChart3,
    metric: "--",
    metricLabel: "Roles monitored",
    status: "active",
  },
  {
    title: "GTM Messaging",
    description:
      "Compare go-to-market positioning, service offerings, and messaging across competitors.",
    href: "/gtm",
    icon: Target,
    metric: "--",
    metricLabel: "Competitors analyzed",
    status: "active",
  },
  {
    title: "Client Sentiment",
    description:
      "Gauge market perception and client sentiment from public reviews, mentions, and surveys.",
    href: "/sentiment",
    icon: TrendingUp,
    metric: "--",
    metricLabel: "Sentiment signals",
    status: "active",
  },
  {
    title: "Competitor Profiles",
    description:
      "Comprehensive profiles for each competitor with aggregated intelligence across all modules.",
    href: "/competitors",
    icon: Users,
    metric: "--",
    metricLabel: "Competitor profiles",
    status: "active",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          CCaSS Competitive Intelligence
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comprehensive competitor insights for Climate Change and Sustainability
          Services. Monitor regulatory shifts, publications, headcount, and market
          positioning in real time.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Competitors Tracked" value="--" />
        <SummaryCard label="Regulations Monitored" value="--" />
        <SummaryCard label="Publications This Month" value="--" />
        <SummaryCard label="Last Data Refresh" value="--" />
      </div>

      {/* Module cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Intelligence Modules
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCardComponent key={module.href} module={module} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function ModuleCardComponent({ module }: { module: ModuleCard }) {
  const Icon = module.icon;

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <Badge
            variant={module.status === "active" ? "secondary" : "outline"}
            className="text-[10px]"
          >
            {module.status === "active" ? "Active" : "Coming Soon"}
          </Badge>
        </div>
        <CardTitle className="mt-3 text-base">{module.title}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {module.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {module.metric}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {module.metricLabel}
            </p>
          </div>
          <Link
            href={module.href}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground group-hover:text-foreground"
          >
            View
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
