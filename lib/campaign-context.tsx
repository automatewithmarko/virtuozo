"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, CREDS_EVENT, setActiveAccountId } from "./browser-store";
import { MOCK_CAMPAIGNS } from "./mock-data";
import type { Ad, Campaign, EntityStatus } from "./types";

export interface MetaConnection {
  mode: "loading" | "demo" | "live" | "error";
  account?: { id: string; name: string; currency: string };
  /** The Facebook Page ads run under (real name for previews) */
  page?: { id: string; name: string };
  /** Domain of the default destination link */
  link_domain?: string;
  error?: string;
}

export interface AdAccountOption {
  id: string;
  name: string;
}

export interface LaunchResult {
  live: boolean;
  warnings?: string[];
}

interface CampaignStore {
  campaigns: Campaign[];
  connection: MetaConnection;
  accounts: AdAccountOption[];
  /** UI-only organization — never touches Meta. */
  archivedIds: ReadonlySet<string>;
  setCampaignArchived: (id: string, archived: boolean) => void;
  setAccount: (id: string) => void;
  refresh: () => Promise<void>;
  getCampaign: (id: string) => Campaign | undefined;
  /** Wizard/Studio "launch": live → publish to Meta (PAUSED) + refresh; demo → local. */
  launchCampaign: (campaign: Campaign) => Promise<LaunchResult>;
  /** Add ads to an existing campaign (live → new adset+ad per ad on Meta). */
  addAdsToCampaign: (
    campaign: Campaign,
    newAds: Ad[],
    rebalancedShares: number[]
  ) => Promise<LaunchResult>;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  updateAd: (campaignId: string, adId: string, patch: Partial<Ad>) => void;
  toggleCampaignStatus: (id: string) => void;
  toggleAdStatus: (campaignId: string, adId: string) => void;
  /** Push current budget shares of a live campaign to its Meta ad sets. */
  syncBudgetShares: (campaignId: string) => void;
}

const CampaignContext = createContext<CampaignStore | null>(null);

function flipStatus(status: EntityStatus): EntityStatus {
  return status === "ACTIVE" ? "PAUSED" : "ACTIVE";
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ARCHIVE_KEY = "virtuozo-archived-campaigns";

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [connection, setConnection] = useState<MetaConnection>({
    mode: "loading",
  });
  const [accounts, setAccounts] = useState<AdAccountOption[]>([]);
  const [archivedIds, setArchivedIds] = useState<ReadonlySet<string>>(
    new Set()
  );
  const activeAccount = useRef<string | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ARCHIVE_KEY);
      // Post-mount hydration: localStorage doesn't exist during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setArchivedIds(new Set(JSON.parse(raw)));
    } catch {
      // corrupt storage — start unarchived
    }
  }, []);

  const setCampaignArchived = useCallback((id: string, archived: boolean) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      if (archived) next.add(id);
      else next.delete(id);
      try {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...next]));
      } catch {
        // storage full — keep in-memory state
      }
      return next;
    });
  }, []);

  const loadCampaigns = useCallback(async (account?: string) => {
    const qs = account ? `?account=${account}` : "";
    const res = await apiFetch(`/api/meta/campaigns${qs}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load campaigns");
    setCampaigns(json.campaigns);
  }, []);

  // Establishes (or re-establishes) the Meta connection from the browser-stored
  // credentials — runs on mount and whenever the user changes their keys.
  const refreshConnection = useCallback(async () => {
    setConnection({ mode: "loading" });
    try {
      const res = await apiFetch("/api/meta/status", { cache: "no-store" });
      const status = await res.json();
      if (status.mode === "live") {
        activeAccount.current = status.account.id;
        setActiveAccountId(status.account.id);
        await loadCampaigns();
        setConnection({
          mode: "live",
          account: status.account,
          page: status.page,
          link_domain: status.link_domain,
        });
        apiFetch("/api/meta/accounts")
          .then((r) => r.json())
          .then((j) => setAccounts(j.accounts ?? []))
          .catch(() => {});
      } else if (status.mode === "error") {
        setConnection({ mode: "error", error: status.error });
      } else {
        setConnection({ mode: "demo" });
        setCampaigns(MOCK_CAMPAIGNS);
      }
    } catch (err) {
      setConnection({
        mode: "error",
        error: err instanceof Error ? err.message : "Connection failed",
      });
    }
  }, [loadCampaigns]);

  useEffect(() => {
    refreshConnection();
    const onCreds = () => refreshConnection();
    window.addEventListener(CREDS_EVENT, onCreds);
    return () => window.removeEventListener(CREDS_EVENT, onCreds);
  }, [refreshConnection]);

  const refresh = useCallback(async () => {
    if (connection.mode !== "live") return;
    await loadCampaigns(activeAccount.current).catch(() => {});
  }, [connection.mode, loadCampaigns]);

  const setAccount = useCallback(
    (id: string) => {
      activeAccount.current = id;
      setActiveAccountId(id);
      const account = accounts.find((a) => a.id === id);
      setConnection((c) =>
        c.mode === "live" && c.account
          ? {
              ...c,
              account: {
                ...c.account,
                id,
                name: account?.name ?? c.account.name,
              },
            }
          : c
      );
      loadCampaigns(id).catch(() => {});
    },
    [accounts, loadCampaigns]
  );

  const getCampaign = useCallback(
    (id: string) => campaigns.find((c) => c.id === id),
    [campaigns]
  );

  const isLive = connection.mode === "live";

  const launchCampaign = useCallback(
    async (campaign: Campaign): Promise<LaunchResult> => {
      if (!isLive) {
        setCampaigns((prev) => [campaign, ...prev]);
        return { live: false };
      }
      const res = await postJson("/api/meta/publish", {
        mode: "new_campaign",
        campaign,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Publishing failed");
      await loadCampaigns(activeAccount.current).catch(() => {});
      return { live: true, warnings: json.warnings };
    },
    [isLive, loadCampaigns]
  );

  const addAdsToCampaign = useCallback(
    async (
      campaign: Campaign,
      newAds: Ad[],
      rebalancedShares: number[]
    ): Promise<LaunchResult> => {
      if (!isLive || !campaign.is_live) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaign.id
              ? {
                  ...c,
                  ads: [
                    ...c.ads.map((a, i) => ({
                      ...a,
                      budget_share: rebalancedShares[i],
                    })),
                    ...newAds,
                  ],
                }
              : c
          )
        );
        return { live: false };
      }
      // Live: create the new ad sets + ads; existing ad set budgets are left
      // untouched (no surprise budget changes on running ads).
      const res = await postJson("/api/meta/publish", {
        mode: "add_ads",
        campaign_id: campaign.id,
        daily_budget: campaign.daily_budget,
        objective: campaign.objective,
        audience: campaign.audience,
        ads: newAds,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Publishing failed");
      await loadCampaigns(activeAccount.current).catch(() => {});
      return { live: true, warnings: json.warnings };
    },
    [isLive, loadCampaigns]
  );

  const updateCampaign = useCallback((id: string, patch: Partial<Campaign>) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }, []);

  const updateAd = useCallback(
    (campaignId: string, adId: string, patch: Partial<Ad>) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId
            ? {
                ...c,
                ads: c.ads.map((a) => (a.id === adId ? { ...a, ...patch } : a)),
              }
            : c
        )
      );
    },
    []
  );

  const pushStatus = useCallback(
    (objectId: string, status: EntityStatus, revert: () => void) => {
      if (!isLive || status === "ENDED") return;
      postJson("/api/meta/update", { id: objectId, fields: { status } })
        .then((res) => {
          if (!res.ok) revert();
        })
        .catch(revert);
    },
    [isLive]
  );

  const toggleCampaignStatus = useCallback(
    (id: string) => {
      const campaign = campaigns.find((c) => c.id === id);
      if (!campaign || campaign.status === "ENDED") return;
      const next = flipStatus(campaign.status);
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: next } : c))
      );
      if (campaign.is_live) {
        pushStatus(id, next, () =>
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, status: campaign.status } : c
            )
          )
        );
      }
    },
    [campaigns, pushStatus]
  );

  const toggleAdStatus = useCallback(
    (campaignId: string, adId: string) => {
      const campaign = campaigns.find((c) => c.id === campaignId);
      const ad = campaign?.ads.find((a) => a.id === adId);
      if (!campaign || !ad || ad.status === "ENDED") return;
      const next = flipStatus(ad.status);
      updateAd(campaignId, adId, { status: next });
      if (campaign.is_live) {
        pushStatus(adId, next, () =>
          updateAd(campaignId, adId, { status: ad.status })
        );
      }
    },
    [campaigns, updateAd, pushStatus]
  );

  const syncBudgetShares = useCallback(
    (campaignId: string) => {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!isLive || !campaign?.is_live) return;
      for (const ad of campaign.ads) {
        if (!ad.adset_id) continue;
        postJson("/api/meta/update", {
          id: ad.adset_id,
          fields: {
            daily_budget_cents: Math.max(
              100,
              Math.round(ad.budget_share * campaign.daily_budget * 100)
            ),
          },
        }).catch(() => {});
      }
    },
    [campaigns, isLive]
  );

  const value = useMemo(
    () => ({
      campaigns,
      connection,
      accounts,
      archivedIds,
      setCampaignArchived,
      setAccount,
      refresh,
      getCampaign,
      launchCampaign,
      addAdsToCampaign,
      updateCampaign,
      updateAd,
      toggleCampaignStatus,
      toggleAdStatus,
      syncBudgetShares,
    }),
    [
      campaigns,
      connection,
      accounts,
      archivedIds,
      setCampaignArchived,
      setAccount,
      refresh,
      getCampaign,
      launchCampaign,
      addAdsToCampaign,
      updateCampaign,
      updateAd,
      toggleCampaignStatus,
      toggleAdStatus,
      syncBudgetShares,
    ]
  );

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaigns(): CampaignStore {
  const ctx = useContext(CampaignContext);
  if (!ctx) {
    throw new Error("useCampaigns must be used within CampaignProvider");
  }
  return ctx;
}
