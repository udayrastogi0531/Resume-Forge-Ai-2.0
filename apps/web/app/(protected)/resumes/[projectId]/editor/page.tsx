"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import {
  Play,
  Download,
  FileArchive,
  ScanSearch,
  Sparkles,
  Loader2,
  ZoomIn,
  ZoomOut,
  WrapText,
  CheckCircle2,
  Circle,
  History,
  type LucideIcon,
} from "lucide-react";
import { api, Project, Version, JobDescription, ATSResult, TailorResult, ApiError } from "@/lib/api";
import { LatexEditor } from "@/components/LatexEditor";
import VersionDrawer from "@/components/VersionDrawer";
import ATSPanel from "@/components/ATSPanel";
import TailorReviewModal from "@/components/TailorReviewModal";
import { toast } from "@/lib/toastStore";

type RightTab = "ats" | "jd";

export default function EditorPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [active, setActive] = useState<Version | null>(null);
  const [latex, setLatex] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfZoomParam, setPdfZoomParam] = useState<string>("page-width");
  const [pdfStale, setPdfStale] = useState(false);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [compiling, setCompiling] = useState(false);

  const [jds, setJds] = useState<JobDescription[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>("");

  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [tailoring, setTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
  const [applyingTailor, setApplyingTailor] = useState(false);

  const [rightTab, setRightTab] = useState<RightTab>("ats");
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(true);
  // Mobile/tablet (< lg breakpoint): only one of editor/preview/panel is
  // shown at a time via tabs, and the version drawer becomes an overlay
  // instead of an always-visible sidebar. Desktop (lg+) is unaffected —
  // all panes render simultaneously exactly as before.
  const [mobilePane, setMobilePane] = useState<"editor" | "preview" | "panel">("editor");
  const [mobileVersionsOpen, setMobileVersionsOpen] = useState(false);

  // Blob URLs render PDFs far more reliably than data: URLs in an iframe.
  const pdfUrl = useMemo(() => {
    if (!pdfBase64) return null;
    const bytes = atob(pdfBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: "application/pdf" }));
  }, [pdfBase64]);
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // PDF viewer zoom/fit uses the browser's native PDF viewer's own open
  // parameters (#zoom=...) rather than a new pdf.js dependency — real
  // zoom control over the real compiled PDF, no additional library.
  const pdfViewerSrc = pdfUrl ? `${pdfUrl}#zoom=${pdfZoomParam}` : null;
  function zoomIn() {
    setPdfZoomParam((z) => String(Math.min(400, (Number.isFinite(Number(z)) ? Number(z) : 100) + 25)));
  }
  function zoomOut() {
    setPdfZoomParam((z) => String(Math.max(25, (Number.isFinite(Number(z)) ? Number(z) : 100) - 25)));
  }

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<string | null>(null);
  const actionsRef = useRef<{ compile: () => void; analyze: () => void; tailor: () => void; save: () => void }>(null!);

  // Keyboard shortcuts: Cmd/Ctrl+S save now, Cmd/Ctrl+Enter compile,
  // Cmd/Ctrl+Shift+A analyze, Cmd/Ctrl+Shift+T tailor. Registered once via
  // a ref so typing doesn't churn the listener; never intercepts plain keys.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        actionsRef.current.save();
      } else if (key === "enter") {
        e.preventDefault();
        actionsRef.current.compile();
      } else if (e.shiftKey && key === "a") {
        e.preventDefault();
        actionsRef.current.analyze();
      } else if (e.shiftKey && key === "t") {
        e.preventDefault();
        actionsRef.current.tailor();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function loadAll() {
    try {
      const [proj, vs, jdList] = await Promise.all([
        api.getProject(projectId),
        api.listVersions(projectId),
        api.listJDs(),
      ]);
      setProject(proj);
      setVersions(vs);
      setJds(jdList);
      const latest = vs.slice().sort((a, b) => b.version_number - a.version_number)[0];
      if (latest) {
        setActive(latest);
        setLatex(latest.latex_source);
        if (latest.job_description_id) setSelectedJdId(latest.job_description_id);
      }
    } catch {
      toast("Could not load this resume project.", "error");
    }
  }

  async function refreshVersions() {
    const vs = await api.listVersions(projectId);
    setVersions(vs);
    return vs;
  }

  function onEditorChange(v: string) {
    setLatex(v);
    setSaveStatus("unsaved");
    if (pdfBase64) setPdfStale(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      autosave(v);
    }, 1200);
  }

  // Single source of truth for persisting editor content. Used by both the
  // debounced autosave and the immediate "Save Now" action/shortcut.
  //
  // Race safety: if a save is already in flight when this is called again
  // (e.g. Save Now right after autosave started, or two rapid Save Now
  // presses), we do NOT fire a second concurrent request. We instead
  // remember only the latest requested content in `pendingSaveRef` and
  // save it automatically right after the in-flight request finishes —
  // so an older/stale value can never overwrite a newer one, and no
  // duplicate network requests are created.
  async function autosave(value: string) {
    if (!active) return;
    if (savingRef.current) {
      pendingSaveRef.current = value;
      return;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      await api.updateVersion(active.id, { latex_source: value });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
      toast("Autosave failed — your edits are still in the editor.", "error");
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current !== null) {
        const next = pendingSaveRef.current;
        pendingSaveRef.current = null;
        autosave(next);
      }
    }
  }

  // "Save Now": cancels any pending debounce timer (so the old, possibly
  // stale, debounced call can never fire afterward) and saves the current
  // editor content immediately through the same `autosave` function —
  // which itself handles the case where a save is already in flight.
  function saveNow() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    autosave(latex);
  }

  actionsRef.current = { compile: handleCompile, analyze: handleAnalyze, tailor: handleTailor, save: saveNow };

  async function handleCompile() {
    setCompiling(true);
    setCompileErrors([]);
    try {
      const result = await api.compile(latex);
      if (result.success && result.pdf_base64) {
        setPdfBase64(result.pdf_base64);
        setPdfStale(false);
        toast("Compiled successfully.", "success");
        setMobilePane("preview");
      } else {
        setPdfBase64(null);
        setCompileErrors(result.errors.length ? result.errors : ["Compilation failed. See log for details."]);
        toast("Compilation failed.", "error");
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Compilation request failed.", "error");
    } finally {
      setCompiling(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedJdId) {
      toast("Select a job description first.", "info");
      return;
    }
    setAnalyzing(true);
    setRightTab("ats");
    try {
      const result = await api.analyze(latex, selectedJdId, active?.id);
      setAtsResult(result);
      setMobilePane("panel");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "ATS analysis failed.", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleTailor() {
    if (!selectedJdId) {
      toast("Select a job description first.", "info");
      return;
    }
    setTailoring(true);
    try {
      // This single request covers AI generation, truthfulness validation,
      // LaTeX compilation and re-scoring server-side. We don't fake
      // intermediate progress ticks for work we can't actually observe
      // completing — the "JD extracted" / "Resume analyzed" facts shown
      // in the overlay below are real, derived from state that already
      // exists (the JD's stored structured_data, and whether ATS Analyze
      // has already been run), not from a timer.
      const result = await api.tailor({
        latex_source: latex,
        job_description_id: selectedJdId,
        project_id: projectId,
      });
      setTailorResult(result);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "AI tailoring failed. Your original resume was not changed.", "error");
    } finally {
      setTailoring(false);
    }
  }

  async function applyTailorAsNewVersion() {
    if (!tailorResult) return;
    setApplyingTailor(true);
    try {
      const jd = jds.find((j) => j.id === selectedJdId);
      const name = jd?.structured_data?.job_title
        ? `Tailored for ${jd.structured_data.job_title}`
        : "Tailored version";
      const newVersion = await api.createVersion(projectId, {
        name,
        latex_source: tailorResult.updated_latex,
        job_description_id: selectedJdId,
        ats_score: tailorResult.ats_after?.score,
        ats_breakdown: tailorResult.ats_after?.breakdown,
      });
      const beforeScore = tailorResult.ats_before?.score;
      const afterScore = tailorResult.ats_after?.score;

      await refreshVersions();
      setActive(newVersion);
      setLatex(newVersion.latex_source);
      if (tailorResult.ats_after) setAtsResult(tailorResult.ats_after);
      setTailorResult(null);

      // Recompile the exact source that was just saved, via the same real
      // /resume/compile endpoint the Compile button uses, so the PDF
      // preview reflects the new version instead of showing stale output.
      setCompiling(true);
      try {
        const compileResult = await api.compile(newVersion.latex_source);
        if (compileResult.success && compileResult.pdf_base64) {
          setPdfBase64(compileResult.pdf_base64);
          setPdfStale(false);
          setCompileErrors([]);
          setMobilePane("preview");
        } else {
          setPdfBase64(null);
          setCompileErrors(compileResult.errors);
        }
      } finally {
        setCompiling(false);
      }

      if (beforeScore != null && afterScore != null) {
        toast(`New version created. ATS score: ${beforeScore} → ${afterScore}.`, "success");
      } else {
        toast("New version created from AI tailoring.", "success");
      }
    } catch {
      toast("Could not save the tailored version.", "error");
    } finally {
      setApplyingTailor(false);
    }
  }

  async function openVersion(v: Version) {
    setActive(v);
    setLatex(v.latex_source);
    setPdfBase64(null);
    setPdfStale(false);
    setCompileErrors([]);
    setAtsResult(null);
    setSaveStatus("saved");
    if (v.job_description_id) setSelectedJdId(v.job_description_id);
  }

  async function renameVersion(v: Version, name: string) {
    if (!name.trim()) return;
    try {
      await api.updateVersion(v.id, { name });
      await refreshVersions();
      toast("Version renamed.", "success");
    } catch {
      toast("Could not rename version.", "error");
    }
  }

  async function duplicateVersion(v: Version) {
    try {
      const dup = await api.duplicateVersion(v.id);
      await refreshVersions();
      toast(`Duplicated as ${dup.name}.`, "success");
    } catch {
      toast("Could not duplicate version.", "error");
    }
  }

  async function deleteVersion(v: Version) {
    try {
      await api.deleteVersion(v.id);
      const vs = await refreshVersions();
      if (active?.id === v.id) {
        const next = vs.slice().sort((a, b) => b.version_number - a.version_number)[0];
        if (next) openVersion(next);
        else {
          setActive(null);
          setLatex("");
        }
      }
      toast("Version deleted.", "success");
    } catch {
      toast("Could not delete version.", "error");
    }
  }

  function downloadTex(v: Version) {
    const blob = new Blob([v.latex_source], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${slug(v.name)}.tex`);
  }

  function downloadPdf() {
    if (!pdfBase64) {
      toast("Compile the resume first to generate a PDF.", "info");
      return;
    }
    const bytes = atob(pdfBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    saveAs(new Blob([arr], { type: "application/pdf" }), `${slug(active?.name || "resume")}.pdf`);
  }

  async function downloadZip() {
    const zip = new JSZip();
    zip.file("resume.tex", latex);
    zip.file(
      "README.txt",
      `ResumeForge AI export\nProject: ${project?.name}\nVersion: ${active?.name}\nGenerated: ${new Date().toISOString()}\n`
    );
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${slug(project?.name || "resume-project")}.zip`);
  }

  function slug(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume";
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop: always-visible sidebar. Mobile/tablet: hidden, opened via overlay below. */}
      <div className="hidden lg:flex">
        <VersionDrawer
          versions={versions}
          activeId={active?.id || null}
          onOpen={openVersion}
          onRename={renameVersion}
          onDuplicate={duplicateVersion}
          onDelete={deleteVersion}
          onDownloadTex={downloadTex}
        />
      </div>

      {/* Mobile/tablet version drawer, as a slide-over sheet */}
      {mobileVersionsOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileVersionsOpen(false)} />
          <div className="relative z-10 h-full">
            <VersionDrawer
              versions={versions}
              activeId={active?.id || null}
              onOpen={(v) => {
                openVersion(v);
                setMobileVersionsOpen(false);
              }}
              onRename={renameVersion}
              onDuplicate={duplicateVersion}
              onDelete={deleteVersion}
              onDownloadTex={downloadTex}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 px-4 py-2 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/resumes")} className="text-[12px] text-neutral-500 hover:text-neutral-200">
              ← Resumes
            </button>
            <button
              onClick={() => setMobileVersionsOpen(true)}
              className="lg:hidden flex items-center gap-1 text-[12px] text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-md px-2 py-1"
              aria-label="Open version history"
            >
              <History size={13} /> Versions
            </button>
            <span className="text-[13px] font-medium truncate">{project?.name}</span>
            <SaveStatusBadge status={saveStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <select
              value={selectedJdId}
              onChange={(e) => setSelectedJdId(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-md text-[12px] px-2 py-1.5 max-w-[180px]"
            >
              <option value="">Select JD…</option>
              {jds.map((jd) => (
                <option key={jd.id} value={jd.id}>
                  {jd.structured_data?.job_title || jd.filename || jd.id.slice(0, 8)}
                </option>
              ))}
            </select>

            <ToolbarButton icon={ScanSearch} label="ATS Analyze" onClick={handleAnalyze} loading={analyzing} />
            <ToolbarButton icon={Sparkles} label="Tailor Resume" onClick={handleTailor} loading={tailoring} accent />
            <ToolbarButton icon={Play} label="Compile" onClick={handleCompile} loading={compiling} accent />

            <div className="w-px h-5 bg-neutral-800 mx-1" />
            <ToolbarButton icon={Download} label="PDF" onClick={downloadPdf} />
            <ToolbarButton icon={FileArchive} label="ZIP" onClick={downloadZip} />
          </div>
        </div>

        {/* Mobile/tablet pane switcher — desktop (lg+) shows all panes at once below and hides this bar */}
        <div className="flex lg:hidden border-b border-neutral-800">
          <MobileTab active={mobilePane === "editor"} onClick={() => setMobilePane("editor")} label="Editor" />
          <MobileTab active={mobilePane === "preview"} onClick={() => setMobilePane("preview")} label="Preview" />
          <MobileTab active={mobilePane === "panel"} onClick={() => setMobilePane("panel")} label="ATS / AI" />
        </div>

        {/* Editor + Preview */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          <div className={`flex-1 flex-col min-w-0 border-r border-neutral-800 lg:flex ${mobilePane === "editor" ? "flex" : "hidden"}`}>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-900 text-[11px] text-neutral-500">
              <span>LaTeX Editor</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setFontSize((f) => Math.max(10, f - 1))}>
                  <ZoomOut size={13} />
                </button>
                <span>{fontSize}px</span>
                <button onClick={() => setFontSize((f) => Math.min(20, f + 1))}>
                  <ZoomIn size={13} />
                </button>
                <button
                  onClick={() => setWordWrap((w) => !w)}
                  className={wordWrap ? "text-emerald-400" : ""}
                  title="Toggle word wrap"
                >
                  <WrapText size={13} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <LatexEditor value={latex} onChange={onEditorChange} fontSize={fontSize} wordWrap={wordWrap} />
            </div>
          </div>

          <div className={`flex-1 flex-col min-w-0 border-r border-neutral-800 lg:flex ${mobilePane === "preview" ? "flex" : "hidden"}`}>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-900 text-[11px] text-neutral-500">
              <span>PDF Preview</span>
              {pdfUrl && (
                <div className="flex items-center gap-2.5">
                  <button onClick={zoomOut} title="Zoom out" aria-label="Zoom out" className="hover:text-neutral-200">
                    <ZoomOut size={13} />
                  </button>
                  <span className="w-10 text-center tabular-nums">
                    {Number.isFinite(Number(pdfZoomParam)) ? `${pdfZoomParam}%` : "Fit"}
                  </span>
                  <button onClick={zoomIn} title="Zoom in" aria-label="Zoom in" className="hover:text-neutral-200">
                    <ZoomIn size={13} />
                  </button>
                  <span className="w-px h-3.5 bg-neutral-800" />
                  <button
                    onClick={() => setPdfZoomParam("page-width")}
                    title="Fit width"
                    aria-label="Fit to width"
                    className={pdfZoomParam === "page-width" ? "text-emerald-400" : "hover:text-neutral-200"}
                  >
                    Fit width
                  </button>
                  <button
                    onClick={() => setPdfZoomParam("page-fit")}
                    title="Fit page"
                    aria-label="Fit to page"
                    className={pdfZoomParam === "page-fit" ? "text-emerald-400" : "hover:text-neutral-200"}
                  >
                    Fit page
                  </button>
                  <button onClick={downloadPdf} title="Download PDF" aria-label="Download PDF" className="hover:text-neutral-200">
                    <Download size={13} />
                  </button>
                </div>
              )}
            </div>
            {pdfUrl && pdfStale && (
              <div className="px-3 py-1.5 bg-amber-950/40 border-b border-amber-900 text-[11px] text-amber-300">
                Preview may be out of date — you&apos;ve edited since the last compile. Recompile to see your latest changes.
              </div>
            )}
            <div className="flex-1 bg-neutral-900 overflow-auto">
              {pdfViewerSrc ? (
                <iframe
                  title="pdf-preview"
                  src={pdfViewerSrc}
                  className="w-full h-full"
                />
              ) : compileErrors.length > 0 ? (
                <div className="p-4">
                  <p className="text-[13px] text-red-400 font-medium mb-2">Compilation failed</p>
                  <ul className="space-y-1 text-[12px] text-red-300 mb-3">
                    {compileErrors.slice(0, 8).map((e, i) => (
                      <li key={i} className="font-mono">
                        {e}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-neutral-500">
                    Your source code has not been lost — fix the LaTeX and compile again.
                  </p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-600 text-[13px]">
                  Click Compile to see a live PDF preview.
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className={`w-full lg:w-80 lg:shrink-0 flex-col lg:flex ${mobilePane === "panel" ? "flex" : "hidden"}`}>
            <div className="flex border-b border-neutral-900">
              <PanelTab active={rightTab === "ats"} onClick={() => setRightTab("ats")} label="ATS / AI" />
              <PanelTab active={rightTab === "jd"} onClick={() => setRightTab("jd")} label="JD" />
            </div>
            <div className="flex-1 overflow-auto p-4">
              {rightTab === "ats" ? (
                atsResult ? (
                  <ATSPanel result={atsResult} />
                ) : (
                  <p className="text-[12px] text-neutral-500">
                    Select a job description and click <span className="text-neutral-300">ATS Analyze</span> to see your compatibility score.
                  </p>
                )
              ) : (
                <JDSummary jd={jds.find((j) => j.id === selectedJdId)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {tailoring && (() => {
        const jd = jds.find((j) => j.id === selectedJdId);
        const jdExtracted = !!jd?.structured_data && !("_error" in jd.structured_data);
        const resumeAnalyzed = atsResult != null;
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-6 py-5 w-80 max-w-[90vw] mx-4">
              <ul className="space-y-1.5 mb-3 text-[12px]">
                <StageRow done={jdExtracted} label="JD extracted" />
                <StageRow
                  done={resumeAnalyzed}
                  label={resumeAnalyzed ? "Resume analyzed" : "Resume analyzed (skipped — run ATS Analyze first for a baseline score)"}
                />
              </ul>
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                <Loader2 className="animate-spin text-emerald-400" size={15} />
                <p className="text-[13px] text-neutral-200">Generating a truthful, tailored version…</p>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">
                This one request covers AI generation, truthfulness validation, LaTeX compilation and re-scoring.
              </p>
            </div>
          </div>
        );
      })()}

      {tailorResult && (
        <TailorReviewModal
          original={latex}
          result={tailorResult}
          applying={applyingTailor}
          onApply={applyTailorAsNewVersion}
          onKeepOriginal={() => setTailorResult(null)}
          onCancel={() => setTailorResult(null)}
        />
      )}
    </div>
  );
}

function StageRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
      ) : (
        <Circle size={13} className="text-neutral-600 shrink-0" />
      )}
      <span className={done ? "text-neutral-300" : "text-neutral-500"}>{label}</span>
    </li>
  );
}

function SaveStatusBadge({ status }: { status: "saved" | "saving" | "unsaved" }) {
  const label = status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Unsaved changes";
  const color = status === "saved" ? "text-emerald-500" : status === "saving" ? "text-neutral-400" : "text-amber-400";
  return <span className={`text-[11px] ${color}`}>● {label}</span>;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  loading,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] disabled:opacity-50 ${
        accent
          ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium"
          : "border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
      }`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  );
}

function MobileTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-selected={active}
      role="tab"
      className={`flex-1 text-[13px] py-2.5 border-b-2 ${
        active ? "border-emerald-400 text-neutral-100" : "border-transparent text-neutral-500"
      }`}
    >
      {label}
    </button>
  );
}

function PanelTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-[12px] py-2 border-b-2 ${
        active ? "border-emerald-400 text-neutral-100" : "border-transparent text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}

function JDSummary({ jd }: { jd?: JobDescription }) {
  if (!jd) return <p className="text-[12px] text-neutral-500">Select a job description from the dropdown above.</p>;
  const sd = jd.structured_data || {};
  return (
    <div className="space-y-3 text-[13px]">
      <div>
        <h3 className="text-[12px] font-medium text-neutral-400">Job Title</h3>
        <p>{sd.job_title || "—"}</p>
      </div>
      <div>
        <h3 className="text-[12px] font-medium text-neutral-400">Company</h3>
        <p>{sd.company || "—"}</p>
      </div>
      {sd.experience_requirements && (
        <div>
          <h3 className="text-[12px] font-medium text-neutral-400">Experience</h3>
          <p>{sd.experience_requirements}</p>
        </div>
      )}
      {sd.education_requirements && (
        <div>
          <h3 className="text-[12px] font-medium text-neutral-400">Education</h3>
          <p>{sd.education_requirements}</p>
        </div>
      )}
      {sd.required_skills && sd.required_skills.length > 0 && (
        <JDChipList label="Required Skills" items={sd.required_skills} tone="emerald" />
      )}
      {sd.preferred_skills && sd.preferred_skills.length > 0 && (
        <JDChipList label="Preferred Skills" items={sd.preferred_skills} tone="neutral" />
      )}
      {sd.keywords && sd.keywords.length > 0 && (
        <JDChipList label="Keywords" items={sd.keywords} tone="neutral" />
      )}
      {sd.responsibilities && sd.responsibilities.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium text-neutral-400 mb-1">Responsibilities</h3>
          <ul className="list-disc list-inside text-[12px] text-neutral-400 space-y-0.5">
            {sd.responsibilities.slice(0, 6).map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function JDChipList({ label, items, tone }: { label: string; items: string[]; tone: "emerald" | "neutral" }) {
  return (
    <div>
      <h3 className="text-[12px] font-medium text-neutral-400 mb-1">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span
            key={s}
            className={`text-[11px] rounded px-1.5 py-0.5 border ${
              tone === "emerald"
                ? "bg-emerald-950/50 text-emerald-300 border-emerald-900"
                : "bg-neutral-900 text-neutral-400 border-neutral-800"
            }`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
