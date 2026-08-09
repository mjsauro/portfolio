#!/usr/bin/env bash
# Renders resume.html to web/public/resume.pdf via headless Chrome.
#
# The PDF is committed, not built in CI: it changes a few times a year, and
# adding a browser to the deploy workflow to regenerate a static file that
# rarely moves is not worth the minutes. Run this by hand after editing
# resume.html, then commit both.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$here/resume.html"
out="$here/../web/public/resume.pdf"

chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [[ ! -x "$chrome" ]]; then
  echo "Chrome not found at: $chrome" >&2
  echo "Set CHROME=/path/to/chrome and re-run." >&2
  exit 1
fi

mkdir -p "$(dirname "$out")"

# --no-pdf-header-footer suppresses the URL and page-number chrome that
# Chrome otherwise stamps onto every printed page.
"$chrome" \
  --headless \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="$out" \
  "file://$src" 2>/dev/null

echo "Wrote $out"
