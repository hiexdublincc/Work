import { GroupLogo } from "@/components/BrandIdentity";
import { Skeleton } from "./ui/skeleton";

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f5f7fa]" aria-label="Loading JMK Group CRM" aria-busy="true">
      <aside className="relative hidden w-[270px] shrink-0 border-r border-[#d9e3ed] bg-[#eef3f8] p-4 sm:block">
        <div className="px-1 pb-5 pt-1">
          <GroupLogo className="h-10 w-40 rounded-xl border border-[#d7e1eb] bg-white px-2.5 py-1.5 shadow-[0_7px_18px_rgba(0,36,96,0.08)]" />
        </div>
        <div className="space-y-2 px-2" aria-hidden="true">
          <Skeleton className="h-3 w-16 rounded-full bg-[#d9e3ed]" />
          <Skeleton className="h-10 w-full rounded-xl bg-white/80" />
          <Skeleton className="h-10 w-full rounded-xl bg-[#dfe7ef]" />
          <Skeleton className="h-10 w-full rounded-xl bg-[#dfe7ef]" />
          <Skeleton className="mt-5 h-3 w-12 rounded-full bg-[#d9e3ed]" />
          <Skeleton className="h-10 w-full rounded-xl bg-[#dfe7ef]" />
          <Skeleton className="h-10 w-full rounded-xl bg-[#dfe7ef]" />
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl p-2" aria-hidden="true">
          <Skeleton className="h-9 w-9 rounded-full bg-[#dff3f6]" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-20 bg-[#d9e3ed]" /><Skeleton className="h-2 w-28 bg-[#dfe7ef]" /></div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-[#dde5ee] bg-[#f5f7fa] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <GroupLogo className="h-7 w-24 rounded-md bg-white px-1.5 py-1 sm:hidden" />
            <div className="space-y-1.5" aria-hidden="true"><Skeleton className="h-2.5 w-24 bg-[#d9e3ed]" /><Skeleton className="h-3.5 w-16 bg-[#cfd9e4]" /></div>
          </div>
          <Skeleton className="h-9 w-24 rounded-xl bg-[#dff3f6]" aria-hidden="true" />
        </header>
        <main className="space-y-5 p-4 sm:p-6 lg:p-8" aria-hidden="true">
          <div className="space-y-3"><Skeleton className="h-8 w-56 rounded-lg bg-[#cfd9e4]" /><Skeleton className="h-4 w-80 max-w-full bg-[#dfe7ef]" /></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl bg-white" />)}
          </div>
          <Skeleton className="h-72 rounded-2xl bg-white" />
        </main>
      </div>
    </div>
  );
}
