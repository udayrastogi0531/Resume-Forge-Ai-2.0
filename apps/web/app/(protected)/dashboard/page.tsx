"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileStack, FileText, Mail, ScanSearch, Plus, Upload, ArrowRight, type LucideIcon } from "lucide-react";
import { api, Project, JobDescription, CoverLetter, DashboardStats } from "@/lib/api";
import { Skeleton } from "@/components/Primitives";
import { toast } from "@/lib/toastStore";
import { useAuthStore } from "@/lib/authStore";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [jds, setJds] = useState<JobDescription[] | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[] | null>(null);

  async function load() {
    try {
      // One aggregate call plus three list calls, in parallel — the
      // dashboard no longer fetches every project's versions individually.
      const [s, p, j, c] = await Promise.all([
        api.dashboardStats(),
        api.listProjects(),
        api.listJDs(),
        api.listCoverLetters(),
      ]);
      setStats(s);
      setProjects(p);
      setJds(j);
      setCoverLetters(c);
    } catch {
      toast("Could not load dashboard data.", "error");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function createResume() {
    try {
      const project = await api.createProject("Untitled Resume");
      router.push(`/resumes/${project.id}/editor`);
    } catch {
      toast("Could not create a new resume.", "error");
    }
  }

  const loading = stats === null || projects === null || jds === null || coverLetters === null;
  const greeting = getGreeting();
  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0];

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <h1 className="text-xl font-medium mb-1">
        {greeting}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-[13px] text-neutral-500 mb-8">Your resume workspace.</p>

      {!loading && stats?.continue_project && (
        <button
          onClick={() => router.push(`/resumes/${stats.continue_project!.id}/editor`)}
          className="w-full text-left border border-neutral-800 rounded-lg p-4 mb-6 flex items-center justify-between hover:border-neutral-700 hover:bg-neutral-900/50 transition-colors group"
        >
          <div>
            <p className="text-[11px] text-neutral-500 mb-0.5">Continue where you left off</p>
            <p className="text-[14px] font-medium">
              {stats.continue_project.name}
              {stats.continue_project.latest_version_name && (
                <span className="text-neutral-500 font-normal"> — {stats.continue_project.latest_version_name}</span>
              )}
            </p>
            {stats.continue_project.latest_ats_score != null && (
              <p className="text-[11px] text-neutral-500 mt-0.5">
                ATS {stats.continue_project.latest_ats_score}/100
              </p>
            )}
          </div>
          <span className="flex items-center gap-1 text-[12px] text-emerald-400 shrink-0">
            Continue Editing <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <QuickAction icon={Plus} label="New Resume" onClick={createResume} />
        <QuickAction icon={Upload} label="Upload Job Description" onClick={() => router.push("/jd")} />
        <QuickAction icon={FileStack} label="Open Resume Studio" onClick={() => router.push("/resumes")} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        <StatCard icon={FileStack} label="Resume Projects" value={loading ? null : stats!.project_count} loading={loading} />
        <StatCard icon={FileText} label="Resume Versions" value={loading ? null : stats!.version_count} loading={loading} />
        <StatCard icon={ScanSearch} label="JDs Analyzed" value={loading ? null : stats!.jd_count} loading={loading} />
        <StatCard icon={Mail} label="Cover Letters" value={loading ? null : stats!.cover_letter_count} loading={loading} />
        <StatCard
          icon={ScanSearch}
          label="Average ATS Score"
          value={loading ? null : stats!.average_ats_score}
          loading={loading}
          suffix={stats?.average_ats_score != null ? "/100" : undefined}
          emptyLabel="No scored versions yet"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <RecentPanel
          title="Recent Resumes"
          loading={loading}
          items={projects?.slice(0, 5).map((p) => ({
            key: p.id,
            primary: p.name,
            secondary: `${p.version_count} version${p.version_count === 1 ? "" : "s"}`,
            href: `/resumes/${p.id}/editor`,
          }))}
          emptyTitle="Your next application starts here."
          emptyAction={
            <button onClick={createResume} className="text-[13px] text-emerald-400 hover:underline">
              Create Resume
            </button>
          }
        />
        <RecentPanel
          title="Recent Job Descriptions"
          loading={loading}
          items={jds?.slice(0, 5).map((jd) => ({
            key: jd.id,
            primary: jd.structured_data?.job_title || jd.filename || "Job description",
            secondary: jd.structured_data?.company || "",
            href: `/jd`,
          }))}
          emptyTitle="Paste the job description that matters."
          emptyAction={
            <Link href="/jd" className="text-[13px] text-emerald-400 hover:underline">
              Upload JD
            </Link>
          }
        />
        <RecentPanel
          title="Recent Cover Letters"
          loading={loading}
          items={coverLetters?.slice(0, 5).map((cl) => ({
            key: cl.id,
            primary: cl.title,
            secondary: cl.tone,
            href: `/cover-letters/${cl.id}`,
          }))}
          emptyTitle="Turn your resume + JD into a tailored cover letter."
          emptyAction={
            <Link href="/cover-letters/new" className="text-[13px] text-emerald-400 hover:underline">
              Create Cover Letter
            </Link>
          }
        />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 border border-neutral-800 rounded-lg px-4 py-3 text-[13px] hover:bg-neutral-900 hover:border-neutral-700 transition-colors text-left"
    >
      <Icon size={16} className="text-emerald-400" strokeWidth={1.75} />
      {label}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  suffix,
  emptyLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null | undefined;
  loading: boolean;
  suffix?: string;
  emptyLabel?: string;
}) {
  return (
    <div className="border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-neutral-500 mb-2">
        <Icon size={14} strokeWidth={1.75} />
        <span className="text-[12px]">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-10" />
      ) : value === undefined || value === null ? (
        <span className="text-[12px] text-neutral-600">{emptyLabel || "—"}</span>
      ) : (
        <span className="text-xl font-semibold">
          {value}
          {suffix && <span className="text-[13px] text-neutral-500 font-normal">{suffix}</span>}
        </span>
      )}
    </div>
  );
}

function RecentPanel({
  title,
  loading,
  items,
  emptyTitle,
  emptyAction,
}: {
  title: string;
  loading: boolean;
  items?: { key: string; primary: string; secondary?: string; href: string }[];
  emptyTitle: string;
  emptyAction: React.ReactNode;
}) {
  return (
    <div className="border border-neutral-800 rounded-lg p-4">
      <h2 className="text-[13px] font-medium mb-3">{title}</h2>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : items && items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex flex-col px-2 py-1.5 rounded-md hover:bg-neutral-900 transition-colors"
              >
                <span className="text-[13px] text-neutral-200 truncate">{item.primary}</span>
                {item.secondary && (
                  <span className="text-[11px] text-neutral-500 truncate">{item.secondary}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-3">
          <p className="text-[13px] text-neutral-500 mb-1.5">{emptyTitle}</p>
          {emptyAction}
        </div>
      )}
    </div>
  );
}
