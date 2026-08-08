# textwizard-tools

The browser-local text & code tools behind [textwizard.us](https://textwizard.us) — free,
MIT-licensed, and dependency-free. Every tool runs entirely in the browser: no uploads,
no accounts, no tracking.

## Layout

- `tools.js` — the tool catalog (names, categories, taglines, SEO metadata) and
  `repoUrlFor()` helper.
- `features/` — one ES module per tool (plus the shared `_editor.js` scaffold).
  Each exports a mount function the consuming site attaches to its tool page.

The Emoji Copy tool's UI lives in the consuming site (it is a static page over
`unicode-emoji-json` data), which is why its catalog entry links here rather
than to a feature module.

## Used by

[textwizard.us](https://textwizard.us) consumes this repo as a package
(`textwizard-tools`) and supplies the page shell, styling, and mounting glue.

## Contributing

Bug reports and tool requests are welcome as
[issues](https://github.com/MichalAFerber/textwizard-tools/issues); pull requests are
welcome too. Keep tools dependency-free and browser-local — nothing a tool does may
leave the user's device.

## License

[MIT](LICENSE) © 2026 Michal Ferber
