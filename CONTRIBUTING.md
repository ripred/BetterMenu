# Contributing

Thanks for helping improve BetterMenu. The best contributions are small, testable, and clear about the embedded constraint they address.

## Good First Places To Help

- Improve or correct documentation.
- Add focused examples for a specific input or display adapter.
- Add host tests for menu behavior in `tests/host_tests.cpp`.
- Improve the static builder in `docs/menu-builder/`.
- Tighten generated code or adapter examples without changing `BetterMenu.h`.

## Before Opening An Issue

Search existing issues first. If the problem is about generated output or a hardware example, include the target board, Arduino core, library versions, and the exact example or builder profile involved.

For bugs, a minimal sketch is usually better than a large project. Keep enough code to show the menu declaration, input adapter, display adapter, and backing values.

## Pull Request Guidelines

- Keep changes scoped to one problem.
- Preserve the header-only design unless the issue is specifically about packaging.
- Avoid heap allocation, Arduino `String`, STL containers, and hidden global state in core library changes.
- Keep input and display adapters independent. A display example should not assume one specific input device unless that is the point of the example.
- Put hardware-specific setup in examples or generated adapter code, not in the core menu declaration API.
- Update docs or examples when behavior changes.

## Local Checks

Run the checks that match the files you changed:

```sh
g++ -std=c++11 -Wall -Wextra -pedantic tests/host_tests.cpp -o /tmp/bettermenu_host_tests
/tmp/bettermenu_host_tests
```

```sh
node --check docs/menu-builder/app.js
node tests/menu_builder_core.mjs
node tests/menu_builder_profiles.mjs
scripts/check-menu-builder-header.sh
```

```sh
git diff --check
```

The GitHub Actions workflow also compiles the portable examples for Arduino Uno, builds host tests, checks JSON, and runs Arduino lint.

## Documentation Style

Use direct, practical language. Prefer concrete commands, code paths, board names, and observable behavior over broad claims. Keep example READMEs useful without turning them into long tutorials.
