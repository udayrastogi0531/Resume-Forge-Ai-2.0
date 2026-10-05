"use client";

import { ATSResult } from "@/lib/api";
import { CheckCircle2, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";

function RadialScore({ score }: { score: number }) {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#262626" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold leading-none">{score}</span>
        <span className="text-[9px] text-neutral-500 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

const STATUS_ICON: Record<string, LucideIcon> = {
  PASS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: XCircle,
};
const STATUS_COLOR: Record<string, string> = {
  PASS: "text-emerald-400",
  WARNING: "text-amber-400",
  ERROR: "text-red-400",
};

const LABELS: Record<string, string> = {
  keyword_match: "Keyword Match",
  required_skills: "Required Skills",
  preferred_skills: "Preferred Skills",
  experience_alignment: "Experience Alignment",
  education_alignment: "Education Alignment",
  ats_formatting: "ATS Formatting",
  title_alignment: "Title Alignment",
};

export default function ATSPanel({ result }: { result: ATSResult }) {
  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-center gap-3">
        <RadialScore score={result.score} />
        <div>
          <p className="text-[12px] text-neutral-400 leading-snug">ResumeForge ATS</p>
          <p className="text-[12px] text-neutral-400 leading-snug">Compatibility Score</p>
        </div>
      </div>

      <div>
        <h3 className="text-[12px] font-medium text-neutral-400 mb-2">Breakdown</h3>
        <div className="space-y-2">
          {Object.entries(result.breakdown).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-[11px] text-neutral-400 mb-0.5">
                <span>{LABELS[key] || key}</span>
                <span>{value}%</span>
              </div>
              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[12px] font-medium text-neutral-400 mb-2">ATS Checks</h3>
        <ul className="space-y-1.5">
          {result.checks.map((c, i) => {
            const Icon = STATUS_ICON[c.status];
            return (
              <li key={i} className="flex items-start gap-2">
                <Icon size={13} className={`shrink-0 mt-0.5 ${STATUS_COLOR[c.status]}`} />
                <div>
                  <span className="text-neutral-300">{c.label}</span>
                  {c.detail && <p className="text-[11px] text-neutral-500">{c.detail}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {result.matched_keywords.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium text-neutral-400 mb-2">Matched Keywords</h3>
          <div className="flex flex-wrap gap-1.5">
            {result.matched_keywords.map((k) => (
              <span key={k} className="text-[11px] bg-emerald-950/50 text-emerald-300 border border-emerald-900 rounded px-1.5 py-0.5">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.missing_keywords.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium text-neutral-400 mb-1">Missing Keywords</h3>
          <p className="text-[11px] text-neutral-600 mb-2">Missing from current resume — not added automatically.</p>
          <div className="flex flex-wrap gap-1.5">
            {result.missing_keywords.map((k) => (
              <span key={k} className="text-[11px] bg-neutral-900 text-neutral-400 border border-neutral-800 rounded px-1.5 py-0.5">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      <Recommendations result={result} />
    </div>
  );
}

/**
 * Deterministic, non-AI recommendations derived only from facts already
 * present in `result` (failing/warning checks and missing keywords). No
 * new information is invented — this just restates existing findings as
 * short actionable lines.
 */
function Recommendations({ result }: { result: ATSResult }) {
  const items: string[] = [];

  const problems = result.checks.filter((c) => c.status !== "PASS");
  for (const c of problems) {
    items.push(c.detail ? `${c.label}: ${c.detail}` : c.label);
  }

  if (result.missing_keywords.length > 0) {
    const shown = result.missing_keywords.slice(0, 5).join(", ");
    items.push(
      `${result.missing_keywords.length} JD requirement${result.missing_keywords.length === 1 ? "" : "s"} not found in your resume: ${shown}${result.missing_keywords.length > 5 ? ", …" : ""}. Only add these if truthfully applicable.`
    );
  }

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-[12px] font-medium text-neutral-400 mb-2">Recommendations</h3>
      <ul className="space-y-1.5 list-disc list-inside text-[12px] text-neutral-400">
        {items.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
    </div>
  );
}
