#!/bin/zsh
cd -- "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  exec node server.mjs
else
  print 'Node.js 20 or newer is required. Install it from nodejs.org, then run this launcher again.'
  read -k 1
fi
