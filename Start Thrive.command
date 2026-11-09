#!/bin/zsh
# Double-click to start Thrive, then open http://localhost:5173 in your browser.
# Uses the copy of Node.js inside this folder (.tools/node), so nothing needs installing.
cd "$(dirname "$0")"
export PATH="$PWD/.tools/node/bin:$PATH"
[ -d node_modules ] || npm install
(sleep 2 && open http://localhost:5173) &
npm run dev -- --port 5173
