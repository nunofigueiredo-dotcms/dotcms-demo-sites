#!/usr/bin/env bash
# One approved message → web JSON, newsletter HTML, Sprinklr hand-off, article PDF.
# See fetch.mjs for options, e.g.  ./fetch.sh --localised APAC  (refused: not approved)
set -euo pipefail
cd "$(dirname "$0")"
exec node fetch.mjs "$@"
