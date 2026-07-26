import TopBar from "@/components/layout/TopBar";
import { CampaignProvider } from "@/lib/campaign-context";
import { StudioProvider } from "@/lib/studio-store";
import type { ReactNode } from "react";

/** App chrome: the top bar plus the campaign + studio data providers. */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <CampaignProvider>
      <StudioProvider>
        <TopBar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </StudioProvider>
    </CampaignProvider>
  );
}
