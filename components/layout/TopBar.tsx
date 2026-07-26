"use client";

import { useCampaigns } from "@/lib/campaign-context";
import { AD_ACCOUNTS } from "@/lib/mock-data";
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TABS = [
  { href: "/ads-manager", label: "Ads Manager", Icon: LayoutDashboard },
  { href: "/studio", label: "Studio", Icon: Sparkles },
];

export default function TopBar() {
  const pathname = usePathname();
  const { connection, accounts, setAccount: setLiveAccount } = useCampaigns();
  const [demoAccount, setDemoAccount] = useState(AD_ACCOUNTS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [slider, setSlider] = useState<{ left: number; width: number } | null>(
    null
  );
  // Optimistic tab so the pill + colors switch the instant you click,
  // without waiting for the new route to load.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const activeHref =
    pendingHref ??
    TABS.find((t) => pathname.startsWith(t.href))?.href ??
    TABS[0].href;

  useLayoutEffect(() => {
    const el = activeHref ? tabRefs.current[activeHref] : null;
    const nav = navRef.current;
    if (el && nav) {
      const navBox = nav.getBoundingClientRect();
      const elBox = el.getBoundingClientRect();
      setSlider({ left: elBox.left - navBox.left, width: elBox.width });
    }
  }, [activeHref]);

  // Clear the optimistic override once the real route catches up.
  useEffect(() => {
    if (pendingHref && pathname.startsWith(pendingHref)) setPendingHref(null);
  }, [pathname, pendingHref]);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "light"
    );
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  const isLive = connection.mode === "live";
  const accountLabel = isLive
    ? (connection.account?.name ?? "Meta account")
    : demoAccount.name;
  const accountOptions = isLive
    ? accounts.map((a) => ({ id: a.id, name: a.name }))
    : AD_ACCOUNTS;
  const activeId = isLive ? connection.account?.id : demoAccount.id;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/ads-manager"
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="Virtuozo" className="h-8 w-auto" />
          Virtuozo
          <span className="mx-1.5 h-5 w-px bg-ink" />
          <span className="font-[family-name:var(--font-montserrat)] text-xs font-medium tracking-wide text-ink">
            Ads Manager
          </span>
        </Link>

        <nav
          ref={navRef}
          className="relative inline-flex items-center gap-1 rounded-full bg-surface p-1.5"
        >
          {slider && (
            <span
              aria-hidden
              className="absolute bottom-1.5 top-1.5 rounded-full bg-brand shadow-sm transition-all duration-300 ease-out"
              style={{ left: slider.left, width: slider.width }}
            />
          )}
          {TABS.map(({ href, label, Icon }) => {
            const active = activeHref === href;
            return (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={() => setPendingHref(href)}
                ref={(el) => {
                  tabRefs.current[href] = el;
                }}
                className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 text-base font-semibold transition-colors duration-300 ${
                  active ? "text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-surface cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/meta.svg" alt="Meta" className="h-3.5 w-auto" />
              <span className="hidden max-w-40 truncate sm:inline">
                {accountLabel}
              </span>
              <span className="sm:hidden">Account</span>
              <ChevronDown className="size-4 text-ink-muted" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 max-h-[min(70vh,24rem)] w-60 overflow-y-auto overscroll-contain rounded-xl border border-line bg-white p-1 shadow-lg">
                {accountOptions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      if (isLive) {
                        setLiveAccount(a.id);
                      } else {
                        setDemoAccount(a);
                      }
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm cursor-pointer ${
                      a.id === activeId
                        ? "bg-brand-soft font-semibold text-brand"
                        : "hover:bg-surface"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/meta.svg" alt="Meta" className="h-3.5 w-auto shrink-0" />
                    <span className="min-w-0 flex-1">
                      {a.name}
                      <span className="block text-xs font-normal text-ink-muted">
                        {isLive ? `act_${a.id}` : a.id}
                      </span>
                    </span>
                  </button>
                ))}
                {isLive && accountOptions.length === 0 && (
                  <p className="px-3 py-2 text-xs text-ink-muted">
                    Loading accounts…
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              aria-label="Account menu"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 transition-colors hover:bg-surface"
            >
              <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-sm font-bold text-brand">
                V
              </span>
              <Menu className="size-4 text-ink-muted" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
                >
                  {theme === "dark" ? (
                    <Sun className="size-4 text-ink-muted" />
                  ) : (
                    <Moon className="size-4 text-ink-muted" />
                  )}
                  {theme === "dark" ? "Light theme" : "Dark theme"}
                </button>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
                >
                  <Settings className="size-4 text-ink-muted" />
                  Settings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-background to-transparent"
      />
    </header>
  );
}
