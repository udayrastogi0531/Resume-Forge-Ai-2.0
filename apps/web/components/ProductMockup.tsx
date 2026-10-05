export default function ProductMockup() {
  return (
    <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">
      {/* window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/80">
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        <span className="ml-3 text-[11px] text-neutral-500">Resume Studio — Software Engineer Resume</span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-neutral-800">
        {/* LaTeX editor pane */}
        <div className="bg-neutral-950 p-4 font-mono text-[10.5px] leading-relaxed">
          <p className="text-neutral-600">% resume.tex</p>
          <p><span className="text-sky-400">\section</span>{"{"}<span className="text-neutral-300">Experience</span>{"}"}</p>
          <p className="text-neutral-400">\textbf{"{"}Software Engineer{"}"}, Acme Corp</p>
          <p className="text-neutral-500">\item Built <span className="bg-emerald-500/20 text-emerald-300 rounded px-0.5">React</span> applications</p>
          <p className="text-neutral-500">\item Improved <span className="bg-emerald-500/20 text-emerald-300 rounded px-0.5">TypeScript</span> coverage</p>
          <p className="text-neutral-700 mt-2">\section{"{"}Skills{"}"}</p>
          <p className="text-neutral-500">JavaScript, <span className="bg-emerald-500/20 text-emerald-300 rounded px-0.5">React</span>, SQL, Git</p>
        </div>

        {/* PDF preview pane */}
        <div className="bg-neutral-100 p-4 text-neutral-800">
          <div className="text-center mb-2">
            <p className="text-[11px] font-bold">Jane Doe</p>
            <p className="text-[7px] text-neutral-500">jane@email.com · San Francisco, CA</p>
          </div>
          <div className="border-t border-neutral-300 pt-1.5 mt-1.5">
            <p className="text-[8px] font-semibold">EXPERIENCE</p>
            <p className="text-[7px] text-neutral-600 mt-0.5">Software Engineer, Acme Corp</p>
            <p className="text-[6.5px] text-neutral-500">• Built React applications</p>
            <p className="text-[6.5px] text-neutral-500">• Improved TypeScript coverage</p>
          </div>
          <div className="border-t border-neutral-300 pt-1.5 mt-2">
            <p className="text-[8px] font-semibold">SKILLS</p>
            <p className="text-[6.5px] text-neutral-500 mt-0.5">JavaScript, React, SQL, Git</p>
          </div>
        </div>
      </div>

      {/* bottom bar: ATS + AI suggestion */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-neutral-800 bg-neutral-900/80">
        <div className="flex items-center gap-1.5">
          <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90 shrink-0">
            <circle cx="11" cy="11" r="9" stroke="#262626" strokeWidth="3" fill="none" />
            <circle
              cx="11" cy="11" r="9" stroke="#34d399" strokeWidth="3" fill="none"
              strokeDasharray={2 * Math.PI * 9} strokeDashoffset={2 * Math.PI * 9 * 0.22} strokeLinecap="round"
            />
          </svg>
          <span className="text-[11px] text-neutral-300">ATS 78</span>
        </div>
        <span className="w-px h-4 bg-neutral-800" />
        <span className="text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-900 rounded-full px-2 py-0.5">
          + React matched
        </span>
        <span className="text-[11px] text-neutral-500 bg-neutral-800/60 border border-neutral-800 rounded-full px-2 py-0.5">
          GraphQL missing
        </span>
      </div>
    </div>
  );
}
