"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { api, JobDescription, Project, Version, ApiError } from "@/lib/api";
import { toast } from "@/lib/toastStore";

const TONES = ["professional", "confident", "concise", "technical", "startup", "formal"];
const LENGTHS = [
  { value: "short", label: "Short (200–300 words)" },
  { value: "medium", label: "Medium (300–450 words)" },
  { value: "long", label: "Long (450–600 words)" },
];

export default function NewCoverLetterPage() {
  const router = useRouter();
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [versionsByProject, setVersionsByProject] = useState<Record<string, Version[]>>({});
  const [jdId, setJdId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [jdList, projectList] = await Promise.all([api.listJDs(), api.listProjects()]);
        setJds(jdList);
        setProjects(projectList);
        const entries: Record<string, Version[]> = {};
        for (const p of projectList) {
          entries[p.id] = await api.listVersions(p.id);
        }
        setVersionsByProject(entries);
      } catch {
        toast("Could not load job descriptions or resumes.", "error");
      }
    })();
  }, []);

  async function generate() {
    if (!jdId || !versionId) {
      toast("Select both a job description and a resume version.", "info");
      return;
    }
    setGenerating(true);
    try {
      const cl = await api.generateCoverLetter({
        resume_version_id: versionId,
        job_description_id: jdId,
        tone,
        length,
      });
      toast("Cover letter generated.", "success");
      router.push(`/cover-letters/${cl.id}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Cover letter generation failed.", "error");
    } finally {
      setGenerating(false);
    }
  }

  const allVersions = Object.entries(versionsByProject).flatMap(([projectId, vs]) =>
    vs.map((v) => ({ ...v, projectName: projects.find((p) => p.id === projectId)?.name || "" }))
  );

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <h1 className="text-lg font-medium mb-1">Generate Cover Letter</h1>
      <p className="text-[13px] text-neutral-500 mb-6">
        Select a job description and resume version. The letter is written only from information in your resume.
      </p>

      <div className="border border-neutral-800 rounded-lg p-5 space-y-5">
        <div>
          <label className="block text-[12px] text-neutral-400 mb-1.5">Job Description</label>
          <select
            value={jdId}
            onChange={(e) => setJdId(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-[13px]"
          >
            <option value="">Select a job description…</option>
            {jds.map((jd) => (
              <option key={jd.id} value={jd.id}>
                {jd.structured_data?.job_title || jd.filename} {jd.structured_data?.company ? `— ${jd.structured_data.company}` : ""}
              </option>
            ))}
          </select>
          {jds.length === 0 && (
            <p className="text-[12px] text-amber-400 mt-1.5">No job descriptions yet — upload one first.</p>
          )}
        </div>

        <div>
          <label className="block text-[12px] text-neutral-400 mb-1.5">Resume Version</label>
          <select
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-[13px]"
          >
            <option value="">Select a resume version…</option>
            {allVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.projectName} — {v.name} (v{v.version_number})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[12px] text-neutral-400 mb-1.5">Tone</label>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`text-[12px] capitalize px-2 py-1.5 rounded-md border ${
                  tone === t ? "border-emerald-600 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[12px] text-neutral-400 mb-1.5">Length</label>
          <div className="grid grid-cols-1 gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLength(l.value)}
                className={`text-[12px] text-left px-3 py-1.5 rounded-md border ${
                  length === l.value ? "border-emerald-600 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-medium text-[13px] rounded-md py-2.5"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? "Generating…" : "Generate Cover Letter"}
        </button>
      </div>
    </div>
  );
}
