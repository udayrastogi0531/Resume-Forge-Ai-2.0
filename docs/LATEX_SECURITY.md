# LaTeX compilation security
Implemented: `-no-shell-escape`, `-halt-on-error`, non-interactive, argv list (no shell), per-compile temp dir
that is deleted, wall-clock timeout, capped log size returned.
NOT implemented: container/namespace isolation, memory/CPU limits, package whitelist, blocking `\input`/`\include`
of arbitrary readable files (TeX's `openin_any=p` default restricts some file reads but this is not a sandbox).
For a public deployment, run compilation in a separate locked-down container (no network, read-only FS,
cgroup limits) or a dedicated worker, and consider `openin_any=p`/`openout_any=p` plus a package allowlist.
