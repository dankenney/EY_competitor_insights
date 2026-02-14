"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TalentSignalsDashboardClient } from "../talent-signals/talent-signals-dashboard-client";
import { HeadcountDashboardClient } from "../headcount/headcount-dashboard-client";

export function TalentDashboardClient() {
  return (
    <Tabs defaultValue="signals" className="space-y-6">
      <TabsList>
        <TabsTrigger value="signals">Talent Signals</TabsTrigger>
        <TabsTrigger value="headcount">Headcount</TabsTrigger>
      </TabsList>

      <TabsContent value="signals">
        <TalentSignalsDashboardClient />
      </TabsContent>

      <TabsContent value="headcount">
        <HeadcountDashboardClient />
      </TabsContent>
    </Tabs>
  );
}
