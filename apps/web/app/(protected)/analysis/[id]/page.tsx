"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, JobDescription, Project, Version, ATSResult, ApiError } from "@/lib/api";
import ATSPanel from "@/components/ATSPanel";
import { Skeleton } from "@/components/Primitives";
import { toast } from "@/lib/toastStore";

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const [jd, setJd] = useState<JobDescription | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [versionsByProject, setVersionsByProject] = useState<Record<string, Version[]>>({});
  const [versionId, setVersionId] = useState("");
  const [result, setResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [jdData, projectList] = await Promise.all([api.getJD(params.id), api.listProjects()]);
        setJd(jdData);
        setProjects(projectList);
        const entries: Record<string, Version[]> = {};
        for (const p of projectList) entries[p.id] = await api.listVersions(p.id);
        setVersionsByProject(entries);
      } catch {
        toast("Could not load this job description.", "error");
      }
    })();
  }, [params.id]);

  const allVersions = Object.entries(versionsByProject).flatMap(([projectId, vs]) =>
    vs.map((v) => ({ ...v, projectName: projects.find((p) => p.id === projectId)?.name || "" }))
  );

  async function runAnalysis() {
    if (!versionId) {
      toast("Select a resume version first.", "info");
      return;
    }
    const version = allVersions.find((v) => v.id === versionId);
    if (!version) return;
    setLoading(true);
    try {
      const r = await api.analyze(version.latex_source, params.id);
      setResult(r);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Analysis failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!jd) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-8">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <h1 className="text-lg font-medium mb-1">ATS Analysis</h1>
      <p className="text-[13px] text-neutral-500 mb-6">
        {jd.structured_data?.job_title || jd.filename} {jd.structured_data?.company ? `— ${jd.structured_data.company}` : ""}
      </p>

      <div className="flex items-center gap-2 mb-6">
        <select
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-[13px] flex-1"
        >
          <option value="">Select a resume version…</option>
          {allVersions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.projectName} — {v.name} (v{v.version_number})
            </option>
          ))}
        </select>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-medium text-[13px] px-4 py-2 rounded-md"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {result ? (
        <div className="border border-neutral-800 rounded-lg p-5">
          <ATSPanel result={result} />
        </div>
      ) : (
        <p className="text-[13px] text-neutral-500">Select a resume version and click Analyze to see its score.</p>
      )}
    </div>
  );
}
