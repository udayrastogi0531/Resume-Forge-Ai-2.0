const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("resumeforge_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("resumeforge_token", token);
  else window.localStorage.removeItem("resumeforge_token");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "Could not reach the ResumeForge API. Is the backend running?");
  }

  if (res.status === 401) {
    setToken(null);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined") window.location.assign("/login");
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------- Types ----------
export interface User {
  id: string;
  email: string;
  full_name?: string | null;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  version_count: number;
}

export interface StructuredJD {
  job_title?: string | null;
  company?: string | null;
  location?: string | null;
  employment_type?: string | null;
  responsibilities?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  technical_skills?: string[];
  soft_skills?: string[];
  education_requirements?: string | null;
  experience_requirements?: string | null;
  certifications?: string[];
  keywords?: string[];
  tools?: string[];
  programming_languages?: string[];
  frameworks?: string[];
  domain_terminology?: string[];
  _error?: string;
}

export interface Version {
  id: string;
  project_id: string;
  version_number: number;
  name: string;
  latex_source: string;
  pdf_path?: string | null;
  ats_score?: number | null;
  ats_breakdown?: Record<string, number> | null;
  job_description_id?: string | null;
  status: string;
  change_summary?: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
}

export interface JobDescription {
  id: string;
  filename?: string | null;
  raw_text: string;
  structured_data?: StructuredJD | null;
  created_at: string;
}

export interface ATSCheckItem {
  label: string;
  status: "PASS" | "WARNING" | "ERROR";
  detail?: string | null;
}

export interface ATSResult {
  score: number;
  breakdown: Record<string, number>;
  checks: ATSCheckItem[];
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface CompileResult {
  success: boolean;
  pdf_base64?: string | null;
  log: string;
  errors: string[];
  warnings: string[];
  duration_ms: number;
}

export interface TailorResult {
  updated_latex: string;
  changes: { type: string; section: string; description: string }[];
  matched_keywords: string[];
  missing_keywords: string[];
  warnings: string[];
  truthfulness_check: { passed: boolean; fabricated_claims: string[] };
  ats_before?: ATSResult | null;
  ats_after?: ATSResult | null;
  compiled: boolean;
  compile_log?: string | null;
}

export interface DashboardStats {
  project_count: number;
  version_count: number;
  jd_count: number;
  cover_letter_count: number;
  average_ats_score: number | null;
  continue_project: {
    id: string;
    name: string;
    version_count: number;
    updated_at: string;
    latest_version_name?: string | null;
    latest_ats_score?: number | null;
  } | null;
}

export interface CoverLetter {
  id: string;
  title: string;
  content: string;
  tone: string;
  length: string;
  resume_version_id?: string | null;
  job_description_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Auth ----------
export const api = {
  signup: (email: string, password: string, full_name?: string) =>
    request<{ access_token: string; user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/api/auth/me"),

  // Projects
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (name: string, initial_latex?: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, initial_latex }),
    }),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  deleteProject: (id: string) =>
    request(`/api/projects/${id}`, { method: "DELETE" }),

  // Versions
  listVersions: (projectId: string) =>
    request<Version[]>(`/api/projects/${projectId}/versions`),
  createVersion: (
    projectId: string,
    payload: {
      name?: string;
      latex_source: string;
      job_description_id?: string;
      ats_score?: number;
      ats_breakdown?: Record<string, number>;
    }
  ) =>
    request<Version>(`/api/projects/${projectId}/versions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getVersion: (id: string) => request<Version>(`/api/projects/versions/${id}`),
  updateVersion: (id: string, payload: { name?: string; latex_source?: string }) =>
    request<Version>(`/api/projects/versions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  duplicateVersion: (id: string) =>
    request<Version>(`/api/projects/versions/${id}/duplicate`, { method: "POST" }),
  deleteVersion: (id: string) =>
    request(`/api/projects/versions/${id}`, { method: "DELETE" }),

  // Job descriptions
  uploadJD: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<JobDescription>("/api/jd/upload", {
      method: "POST",
      body: formData,
    });
  },
  listJDs: () => request<JobDescription[]>("/api/jd"),
  getJD: (id: string) => request<JobDescription>(`/api/jd/${id}`),
  deleteJD: (id: string) => request(`/api/jd/${id}`, { method: "DELETE" }),

  // Compile / ATS / Tailor
  compile: (latex_source: string) =>
    request<CompileResult>("/api/resume/compile", {
      method: "POST",
      body: JSON.stringify({ latex_source }),
    }),
  analyze: (latex_source: string, job_description_id: string, version_id?: string) =>
    request<ATSResult>("/api/resume/analyze", {
      method: "POST",
      body: JSON.stringify({ latex_source, job_description_id, version_id }),
    }),
  tailor: (payload: { latex_source: string; job_description_id: string; project_id: string }) =>
    request<TailorResult>("/api/resume/tailor", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Dashboard
  dashboardStats: () => request<DashboardStats>("/api/dashboard/stats"),

  // Cover letters
  generateCoverLetter: (payload: {
    resume_version_id: string;
    job_description_id: string;
    tone: string;
    length: string;
  }) =>
    request<CoverLetter>("/api/cover-letters/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listCoverLetters: () => request<CoverLetter[]>("/api/cover-letters"),
  getCoverLetter: (id: string) => request<CoverLetter>(`/api/cover-letters/${id}`),
  updateCoverLetter: (id: string, payload: { title?: string; content?: string }) =>
    request<CoverLetter>(`/api/cover-letters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  duplicateCoverLetter: (id: string) =>
    request<CoverLetter>(`/api/cover-letters/${id}/duplicate`, { method: "POST" }),
  deleteCoverLetter: (id: string) =>
    request(`/api/cover-letters/${id}`, { method: "DELETE" }),
};
