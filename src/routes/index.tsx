import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRequirements } from "@/lib/requirements-store";
import { emptyRequirements } from "@/lib/matching/types";
import hero from "@/assets/hero-storefront.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PopUp Detroit — Big ideas deserve space. Not long leases." },
      { name: "description", content: "Describe your business and get AI-matched, source-linked Detroit commercial spaces for pop-ups and short-term use." },
      { property: "og:title", content: "PopUp Detroit — Big ideas deserve space" },
      { property: "og:description", content: "AI-matched flexible commercial space across Detroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { req, setReq, setDna } = useRequirements();
  const [text, setText] = useState(req.description);
  const navigate = useNavigate();

  const go = () => {
    if (text.trim() !== req.description) { setReq({ ...emptyRequirements(), description: text.trim() }); setDna(null); }
    navigate({ to: "/match", search: { auto: text.trim().length >= 10 ? 1 : undefined } });
  };

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-20">
        <div>
          <p className="eyebrow">Short-term commercial space · Detroit</p>
          <h1 className="mt-4 text-5xl leading-[1.02] md:text-6xl lg:text-7xl">Big ideas deserve space. <em className="text-primary">Not long leases.</em></h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">From weekend pop-ups to temporary storefronts, discover commercial spaces that fit your business, not the other way around.</p>
          <div className="mt-8 rounded-xl border border-border bg-card p-2 shadow-card">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
              placeholder="Tell us what you're building. For example, I need a clothing pop-up in Midtown for two weekends under $600."
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
              <Link to="/owners" className="text-sm text-muted-foreground hover:text-foreground">List Your Property →</Link>
              <Button onClick={go} size="lg">Find My Space <ArrowRight /></Button>
            </div>
          </div>
        </div>
        <div className="relative">
          <img src={hero} alt="Sunlit empty storefront interior" width={1600} height={1104} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card" />
          <p className="mt-2 text-xs text-muted-foreground">Illustrative image — not a listed property.</p>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <p className="font-display text-3xl md:text-4xl">Detroit doesn't just have a space problem. <span className="text-muted-foreground">It has a connection problem.</span></p>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              ["01", "Describe your business", "In your own words — or fill the form step by step."],
              ["02", "AI reads your requirements", "Business DNA turns your text into editable, structured needs."],
              ["03", "Discover compatible spaces", "Real, source-linked listings screened and ranked transparently."],
              ["04", "Request or propose", "Book verified spaces or propose a flexible lease to the owner."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <p className="font-display text-primary">{n}</p>
                <h3 className="mt-2 text-xl">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <p className="eyebrow">Two ways to find space</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-8">
            <span className="rounded-full bg-status-verified-bg px-2.5 py-0.5 text-xs font-medium text-status-verified">Ready for short-term use</span>
            <h3 className="mt-4 text-2xl">Owner-confirmed terms</h3>
            <p className="mt-2 text-muted-foreground">Explore properties whose owners have confirmed short-term rental terms and availability.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-8">
            <span className="rounded-full bg-status-advertised-bg px-2.5 py-0.5 text-xs font-medium text-status-advertised">Explore flexible leasing</span>
            <h3 className="mt-4 text-2xl">Propose something new</h3>
            <p className="mt-2 text-muted-foreground">Discover real commercial listings and propose temporary arrangements, subject to owner approval.</p>
          </div>
        </div>

        <div className="mt-16 grid gap-x-10 gap-y-6 md:grid-cols-3">
          {[
            ["Lower barriers", "Test a concept for a weekend before committing to years."],
            ["Flexible arrangements", "Day, weekend, monthly and recurring proposals."],
            ["Intelligent matching", "Rules you can inspect, scores you can trace."],
            ["Clear restrictions", "Prohibited uses and missing facts flagged up front."],
            ["Transparent verification", "Every listing shows its source and last-checked date."],
            ["Activating space", "New paths for owners to put underused space to work."],
          ].map(([t, d]) => (
            <div key={t} className="border-t border-border pt-4">
              <h3 className="text-lg">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
