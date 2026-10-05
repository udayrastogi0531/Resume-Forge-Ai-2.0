export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  latex: string;
}

const MODERN_DEVELOPER = String.raw`\documentclass[11pt,letterpaper]{article}
\usepackage[margin=0.7in]{geometry}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{hyperref}
\pagestyle{empty}
\titleformat{\section}{\large\bfseries\color{black}}{}{0em}{}[\vspace{1pt}\titlerule]
\titlespacing*{\section}{0pt}{10pt}{6pt}

\begin{document}

\begin{center}
{\Huge \textbf{Your Name}}\\[4pt]
your.email@example.com \; $\vert$ \; (555) 123-4567 \; $\vert$ \; City, State \; $\vert$ \; linkedin.com/in/you
\end{center}

\section{Experience}
\textbf{Software Engineer} \hfill 2022--Present\\
\textit{Company Name} \hfill City, State
\begin{itemize}[leftmargin=*,itemsep=1pt]
  \item Describe a real responsibility or accomplishment.
  \item Use active verbs and quantify impact where truthful.
\end{itemize}

\section{Projects}
\textbf{Project Name} \hfill 2023
\begin{itemize}[leftmargin=*,itemsep=1pt]
  \item What you built and the technologies used.
\end{itemize}

\section{Education}
\textbf{Degree}, School Name \hfill Year--Year

\section{Skills}
\textbf{Languages:} \; List real languages here \\
\textbf{Tools:} \; List real tools here

\end{document}
`;

const ATS_MINIMAL = String.raw`\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage{enumitem}
\pagestyle{empty}
\setlength{\parindent}{0pt}

\begin{document}

{\Large \textbf{Your Name}}\\
your.email@example.com $\cdot$ (555) 123-4567 $\cdot$ City, State

\vspace{8pt}
\textbf{EXPERIENCE}
\vspace{4pt}
\hrule
\vspace{6pt}

\textbf{Job Title}, Company Name (2022 -- Present)
\begin{itemize}[leftmargin=18pt,itemsep=1pt]
  \item Plain, single-column, ATS-friendly bullet.
\end{itemize}

\vspace{8pt}
\textbf{EDUCATION}
\vspace{4pt}
\hrule
\vspace{6pt}
Degree, School Name (Year -- Year)

\vspace{8pt}
\textbf{SKILLS}
\vspace{4pt}
\hrule
\vspace{6pt}
List your real skills, comma separated.

\end{document}
`;

const ACADEMIC = String.raw`\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage{enumitem}
\pagestyle{empty}

\begin{document}

\begin{center}
{\LARGE \textbf{Your Name}}\\
your.email@example.com $\cdot$ (555) 123-4567 $\cdot$ City, State
\end{center}

\section*{Education}
\textbf{Ph.D. in Field}, University Name \hfill Year--Year\\
Dissertation: \textit{Title of your dissertation}

\section*{Publications}
\begin{enumerate}[leftmargin=*]
  \item Author list. (Year). Title of paper. \textit{Journal Name}.
\end{enumerate}

\section*{Research Experience}
\textbf{Research Assistant}, Lab/Department Name \hfill Year--Year
\begin{itemize}[leftmargin=*]
  \item Describe a real research contribution.
\end{itemize}

\section*{Teaching Experience}
\textbf{Teaching Assistant}, Course Name \hfill Year

\section*{Skills}
List real research/technical skills here.

\end{document}
`;

export const TEMPLATES: ResumeTemplate[] = [
  { id: "modern", name: "Modern Developer", description: "Clean two-tier headings, good for tech roles.", latex: MODERN_DEVELOPER },
  { id: "ats-minimal", name: "ATS Minimal", description: "Single-column, no styling tricks — built to parse cleanly.", latex: ATS_MINIMAL },
  { id: "academic", name: "Academic", description: "Publications, research and teaching sections.", latex: ACADEMIC },
];
