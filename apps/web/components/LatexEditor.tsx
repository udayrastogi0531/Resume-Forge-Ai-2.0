"use client";

import Editor, { OnMount, DiffEditor, loader } from "@monaco-editor/react";
import * as monacoLib from "monaco-editor";
import { useRef } from "react";

type Monaco = Parameters<OnMount>[1];

// Bundle Monaco locally instead of loading it from a CDN (works offline / behind firewalls).
loader.config({ monaco: monacoLib });

if (typeof window !== "undefined") {
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    // Only the base editor worker is needed: LaTeX uses a custom Monarch tokenizer.
    getWorker: () =>
      new Worker(new URL("monaco-editor/editor/editor.worker.js", import.meta.url), {
        type: "module",
      }),
  };
}

function registerLatexLanguage(monaco: Monaco) {
  if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === "latex")) return;

  monaco.languages.register({ id: "latex" });
  monaco.languages.setMonarchTokensProvider("latex", {
    tokenizer: {
      root: [
        [/%.*$/, "comment"],
        [/\\[a-zA-Z]+\*?/, "keyword"],
        [/[{}]/, "delimiter.curly"],
        [/\[[^\]]*\]/, "delimiter.square"],
        [/\$\$?/, "string"],
        [/\\\\/, "keyword"],
      ],
    },
  });
  monaco.editor.defineTheme("resumeforge-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "keyword", foreground: "4FC1FF" },
      { token: "delimiter.curly", foreground: "D4D4D4" },
      { token: "string", foreground: "CE9178" },
    ],
    colors: {
      "editor.background": "#0a0a0a",
    },
  });
}

export function LatexEditor({
  value,
  onChange,
  fontSize = 13,
  wordWrap = true,
}: {
  value: string;
  onChange: (v: string) => void;
  fontSize?: number;
  wordWrap?: boolean;
}) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    if (process.env.NEXT_PUBLIC_E2E === "1") {
      (window as unknown as { __rfEditor?: unknown }).__rfEditor = editor; // test hook only
    }
    registerLatexLanguage(monaco);
    monaco.editor.setTheme("resumeforge-dark");
    editor.updateOptions({
      wordWrap: wordWrap ? "on" : "off",
      minimap: { enabled: false },
      fontSize,
    });
  };

  return (
    <Editor
      height="100%"
      language="latex"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      theme="resumeforge-dark"
      options={{
        fontSize,
        wordWrap: wordWrap ? "on" : "off",
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: "gutter",
      }}
    />
  );
}

export function LatexDiffEditor({ original, modified }: { original: string; modified: string }) {
  // Real, functional accommodation for narrow screens: Monaco's own inline
  // (unified) diff view instead of squeezing two columns into little
  // space. Read once at mount — not a fake responsive animation, just a
  // sensible one-time choice of Monaco's built-in rendering mode.
  const sideBySide = typeof window !== "undefined" ? window.innerWidth >= 1024 : true;
  return (
    <DiffEditor
      height="100%"
      language="latex"
      original={original}
      modified={modified}
      theme="resumeforge-dark"
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      beforeMount={(monaco) => registerLatexLanguage(monaco)}
      options={{
        fontSize: 12,
        readOnly: true,
        minimap: { enabled: false },
        automaticLayout: true,
        renderSideBySide: sideBySide,
      }}
    />
  );
}
