# Jargon Lens

Hover over an acronym or buzzword on Slack, Gmail, Outlook, Notion and more, and get a plain-English meaning. Point it at your company's shared glossary and it learns your team's own jargon too.

Built for new hires, who spend their first month nodding along to `P0`, `OKR`, `RACI` and "let's take this offline".

## What it does

- **Underlines known jargon** on the page with a dotted line, without changing the page itself. It uses the browser's CSS Custom Highlight API, so it does not break Slack, Gmail or other apps that manage their own DOM.
- **Shows a tooltip on hover** with the meaning and where it came from.
- **Ships with about 90 built-in terms**: project management, engineering, finance, HR and meeting phrases (`OKR`, `P0`, `SLA`, `RCA`, `circle back`, `tech debt`, ...).
- **Learns company jargon** from a shared glossary link (JSON or CSV) that refreshes every six hours, or from terms you paste in. Your terms override the built-in ones.
- **Never touches what you type.** Text in editable boxes, code blocks and inputs is skipped.

## Install (developer mode)

1. Clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Open Slack, Gmail or any supported site and hover an underlined term.

Click the toolbar icon to switch it off or to open the glossary settings.

## Add your company glossary

Open the extension's options page and either:

- paste a link to a `.json` or `.csv` file, for example a raw file in a private repo or a published sheet, or
- paste terms directly, one per line as `TERM,meaning`.

Accepted formats:

```csv
term,meaning
Atlas,"Our 2026 platform rewrite"
NPS,Net Promoter Score
```

```json
[{ "term": "Atlas", "meaning": "Our 2026 platform rewrite" }]
```

Chrome asks for permission to read the file's website the first time you add a link. Nothing is sent anywhere else, and nothing leaves your browser.

## Supported sites

Slack, Gmail, Outlook (web), Notion, Confluence/Jira (Atlassian), Microsoft Teams (web) and GitHub. To add another site, put its address in `matches` in `manifest.json`.

**Known limit:** Google Docs draws its text on a canvas rather than as page text, so there is nothing for the extension to read there. Docs is not supported.

## How it works

| File | Job |
| --- | --- |
| `src/matcher.js` | Finds glossary terms in text: whole words only, acronyms case-sensitive, longest phrase first, plurals like `OKRs` |
| `src/content.js` | Scans visible text, draws the underline highlights, hit-tests the mouse position and shows the tooltip |
| `src/background.js` | Downloads and refreshes shared glossary files |
| `src/glossary-parse.js` | Reads JSON or CSV glossaries |
| `src/glossary.json` | The built-in terms (`npm run build` turns it into `glossary.js`) |

## Develop

```bash
npm test          # matcher and glossary-parser tests
npm run build     # regenerate src/glossary.js after editing src/glossary.json
```

Requires Node 20 or newer for the tests. The extension itself has no dependencies.

## License

MIT
