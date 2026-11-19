import { SiteNav } from "@/components/site-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen pt-14">{children}</main>
    </>
  );
}
