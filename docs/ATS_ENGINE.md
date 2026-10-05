# ATS engine (`app/ats/engine.py`)
Score = weighted sum: required skills 30%, keyword match 20%, ATS formatting 15%, experience 15%,
preferred skills 10%, education 10%. Title alignment is reported but not weighted.
Keyword matching tokenizes the resume text and normalizes aliases (JS/JavaScript, React.js/React, Node.js/Node...).
Format checks: contact info, standard sections, multi-column, tables, images, fancyhdr, length, keyword stuffing.
Experience/education alignment are simple heuristics (year mentions, degree words), not deep parsing.
The score is labelled "ResumeForge ATS Compatibility Score" and is not a real ATS's score.
