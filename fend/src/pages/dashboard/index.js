import { AppSidebar } from "@/components/Layout/app-sidebar";
import { DataTable } from "@/components/Layout/data-table";
import { SectionCards } from "@/components/Layout/section-cards";
import { SiteHeader } from "@/components/Layout/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NginxLogsChart } from "@/components/Nginx/NginxLogsChart";

import data from "./data.json";

export default function Page() {
  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <NginxLogsChart />
      </div>
      <DataTable data={data} />
    </>
  );
}
