import Link from "next/link";
import {
  FileCode2,
  ScanSearch,
  Sparkles,
  Mail,
  GitBranch,
  ShieldCheck,
  Upload,
  ListChecks,
  Wand2,
} from "lucide-react";
import ProductMockup from "@/components/ProductMockup";
import Reveal from "@/components/Reveal";

const CAPABILITIES = [
  "Real LaTeX",
  "AI Tailoring",
  "Deterministic ATS",
  "JD Intelligence",
  "Version Control",
  "PDF Export",
];

const STEPS = [
  { n: "01", label: "Upload JD", desc: "Drop in a job description PDF." },
  { n: "02", label: "Analyze Requirements", desc: "See required and preferred skills extracted." },
  { n: "03", label: "Tailor Resume", desc: "AI rewrites only what your resume already supports." },
  { n: "04", label: "Review Changes", desc: "A real diff — nothing is applied silently." },
  { n: "05", label: "Export", desc: "Download the PDF, the .tex source, or both." },
];

const SHOWCASE = [
  { icon: FileCode2, title: "Resume Studio", desc: "A split-screen LaTeX editor with live PDF compilation via real pdflatex — no fake previews." },
  { icon: ListChecks, title: "JD Intelligence", desc: "Job title, company, required/preferred skills, responsibilities, experience and education — extracted, not guessed." },
  { icon: ScanSearch, title: "ATS Analysis", desc: "A deterministic compatibility score computed from keyword coverage and formatting checks, not an LLM's opinion." },
  { icon: Wand2, title: "AI Tailoring", desc: "Rewrites and reorders existing content to match a JD. Missing requirements are reported, never invented." },
  { icon: GitBranch, title: "Version History", desc: "Every tailoring pass creates a new version. The original is never overwritten." },
  { icon: Mail, title: "Cover Letters", desc: "Generated from the same resume and JD data, in the tone you choose." },
];

const TRUST_STEPS = [
  "Source resume is the source of truth",
  "AI rewrites, reorders and clarifies — it does not invent",
  "Missing JD requirements are reported, not fabricated",
  "You review a real diff before anything is applied",
  "The original version is never overwritten",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* subtle background gradient, no external images */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(600px circle at 50% -10%, rgba(16,185,129,0.08), transparent 60%)",
        }}
      />

      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="font-semibold tracking-tight">
          ResumeForge <span className="text-emerald-400">AI</span>
        </span>
        <div className="flex items-center gap-3 text-[13px]">
          <Link href="/login" className="text-neutral-400 hover:text-neutral-100 transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            Start Building
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-full px-3 py-1 mb-6">
            <Sparkles size={11} /> AI-Powered Resume Engineering
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Build a resume that gets understood by both ATS systems and humans.
          </h1>
          <p className="mt-5 text-neutral-400 text-[15px] leading-relaxed max-w-lg">
            Edit real LaTeX, analyze job descriptions, optimize ATS compatibility, and
            create truthful tailored resumes with AI.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium text-[13px] px-5 py-2.5 rounded-md transition-colors"
            >
              Build My Resume
            </Link>
            <Link
              href="/login"
              className="border border-neutral-800 hover:border-neutral-700 text-[13px] px-5 py-2.5 rounded-md text-neutral-300 transition-colors"
            >
              Explore Resume Studio
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-neutral-500">
            {CAPABILITIES.map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" /> {c}
              </span>
            ))}
          </div>
        </div>
        <Reveal>
          <ProductMockup />
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-neutral-900">
        <Reveal>
          <h2 className="text-xl font-semibold text-center mb-10">How it works</h2>
        </Reveal>
        <div className="grid sm:grid-cols-5 gap-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="border border-neutral-800 rounded-lg p-4 h-full hover:border-neutral-700 transition-colors">
                <span className="text-[11px] text-emerald-500 font-mono">{s.n}</span>
                <p className="text-[13px] font-medium mt-1">{s.label}</p>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-neutral-900">
        <Reveal>
          <h2 className="text-xl font-semibold text-center mb-2">Everything the workflow needs</h2>
          <p className="text-[13px] text-neutral-500 text-center mb-10">
            Six real, working pieces — not a features list of things that don&apos;t exist yet.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SHOWCASE.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 60}>
                <div className="border border-neutral-800 rounded-lg p-5 bg-neutral-900/40 h-full hover:border-neutral-700 hover:bg-neutral-900/70 transition-colors">
                  <Icon size={18} className="text-emerald-400 mb-3" strokeWidth={1.75} />
                  <h3 className="text-[14px] font-medium mb-1.5">{f.title}</h3>
                  <p className="text-[13px] text-neutral-500 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* AI SAFETY / TRUST */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-neutral-900">
        <Reveal>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 border border-neutral-800 rounded-full px-3 py-1 mb-4">
              <ShieldCheck size={12} className="text-emerald-400" /> Truthfulness by design
            </span>
            <h2 className="text-xl font-semibold">AI does not invent your experience.</h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            {TRUST_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-3 text-[13px]">
                <span className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-900 text-emerald-400 text-[10px] flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-neutral-300">{step}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center border-t border-neutral-900">
        <Reveal>
          <h2 className="text-2xl font-semibold mb-3">Start with the resume you already have.</h2>
          <p className="text-[14px] text-neutral-500 mb-7">
            Paste it, upload it, or start from a template — nothing is invented from thin air.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium text-[13px] px-6 py-3 rounded-md transition-colors"
          >
            <Upload size={14} /> Build My Resume
          </Link>
        </Reveal>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-neutral-900">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-neutral-600">
          <span>ResumeForge AI — your data, your resume, your control.</span>
          <span>
            Built by <span className="text-neutral-400">Uday Prakash Rastogi</span> — AI · Full Stack · Developer Tools
          </span>
        </div>
      </footer>
    </div>
  );
}
