import Link from "next/link";
import { ArrowRight, FileText, Lock, Search, Sparkles, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

const STEPS = [
  {
    n: "01",
    title: "Upload what you already have",
    body: "Drop in handbooks, policies, contracts, and runbooks — PDF, Word, plain text, or Markdown.",
    icon: UploadCloud,
  },
  {
    n: "02",
    title: "Ask it in plain language",
    body: '"What\'s our refund policy?" "How do we onboard a new hire?" No search syntax to learn.',
    icon: Search,
  },
  {
    n: "03",
    title: "Get an answer you can verify",
    body: "Every sentence is backed by a citation back to the exact document it came from.",
    icon: FileText,
  },
];

const FEATURES = [
  {
    title: "Answers, not guesses",
    body: "If it's not in your documents, Plabix Nexus says so instead of making something up.",
    icon: Sparkles,
  },
  {
    title: "Built for your whole team",
    body: "Every organization's documents and conversations are isolated from every other's, by design.",
    icon: Lock,
  },
  {
    title: "Finds the right passage",
    body: "Semantic vector search reads for meaning, not just keywords, across your entire library.",
    icon: Search,
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold tracking-tight">
            Plabix Nexus
          </span>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Retrieval-augmented chat for your documents
            </span>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Ask your documents anything. Get answers you can{" "}
              <span className="bg-accent px-1 text-accent-foreground">trace back</span> to the
              source.
            </h1>
            <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
              Plabix Nexus turns your handbooks, policies, and internal docs into a chat
              interface your whole team can ask — every answer cited, nothing made up.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="relative rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-3 text-sm font-medium text-muted-foreground">You asked</p>
            <p className="mb-5 rounded-lg bg-muted px-4 py-3 text-sm">
              What&apos;s our policy on remote work?
            </p>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Plabix Nexus answered</p>
            <p className="text-sm leading-relaxed">
              Employees may work remotely up to three days per week with manager approval
              <CitationChip n={1} />. Fully remote arrangements require VP sign-off and a
              documented home-office assessment
              <CitationChip n={2} />.
            </p>
            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <SourceLine n={1} title="Employee Handbook 2026.pdf" />
              <SourceLine n={2} title="Remote Work Policy.docx" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps from document to answer
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="flex flex-col gap-3">
                  <span className="font-display text-3xl font-semibold text-primary/30">
                    {step.n}
                  </span>
                  <step.icon className="size-5 text-primary" />
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Made for teams who need to trust the answer
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
                <feature.icon className="size-5 text-primary" />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Your documents already have the answers.
              </h2>
              <p className="mt-2 text-muted-foreground">
                Plabix Nexus just makes them searchable in plain language.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/signup">
                Create your workspace <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Plabix Nexus.</span>
          <span>Built with Next.js and Supabase.</span>
        </div>
      </footer>
    </div>
  );
}

function CitationChip({ n }: { n: number }) {
  return (
    <sup className="ml-0.5 inline-flex size-4 items-center justify-center rounded-sm bg-accent text-[10px] font-semibold text-accent-foreground">
      {n}
    </sup>
  );
}

function SourceLine({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex size-4 items-center justify-center rounded-sm bg-accent text-[10px] font-semibold text-accent-foreground">
        {n}
      </span>
      <span>{title}</span>
    </div>
  );
}
