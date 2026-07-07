#!/bin/bash
if grep -q "theme-toggle-btn" /home/radxa/projects/portfolio/build/index.html; then
  echo "Theme toggle found in build output."
else
  echo "Theme toggle missing in build output."
fi

if grep -q "data-theme" /home/radxa/projects/portfolio/build/index.html; then
  echo "Theme inline script found in build output."
else
  echo "Theme inline script missing in build output."
fi
