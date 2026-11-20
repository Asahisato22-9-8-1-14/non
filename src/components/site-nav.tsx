"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/", label: "System" },
  { href: "/dashboard", label: "Home" },
  { href: "/maps", label: "Maps" },
  { href: "/notes", label: "Notes" },
  { href: "/decks", label: "Flashcards" },
  { href: "/chat", label: "AI Chat" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="site-icon" aria-hidden="true" />
          <span className="text-[15px] font-semibold tracking-tight">StudyX</span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="flex items-center">
            {LINKS.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href) ||
                    (href === "/decks" && pathname.startsWith("/study"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3 ${
                    active
                      ? "font-medium text-ink"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <span className="mx-1 h-4 w-px bg-line" />
          <Link
            href="/settings"
            aria-label="Settings — AI & API"
            title="Settings — AI & API"
            className={`btn-icon h-8 w-8 border-transparent bg-transparent ${
              pathname.startsWith("/settings") ? "text-ink" : ""
            }`}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
