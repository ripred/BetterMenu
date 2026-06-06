#!/usr/bin/env sh
set -eu

root_header="BetterMenu.h"
builder_header="docs/menu-builder/vendor/BetterMenu.h"

if ! cmp -s "$root_header" "$builder_header"; then
    echo "$builder_header is out of sync with $root_header"
    echo "Update it with: cp BetterMenu.h docs/menu-builder/vendor/BetterMenu.h"
    exit 1
fi

echo "$builder_header matches $root_header"
