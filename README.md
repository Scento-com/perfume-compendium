# Scento Perfume Compendium

<!-- mcp-name: com.scento/perfume-compendium -->

The perfume knowledge connector for AI assistants, from [Scento](https://www.scento.com), Europe's largest perfume decant website, founded in Paris in 2024.

Ask Claude, ChatGPT, Cursor or any MCP client for the portrait of a perfume, the difference between two you are torn over, the scents built on the same structure, or what a raw material such as ambroxan smells like. It covers 700+ designer and niche perfumes, 400+ raw materials and Scento's own fragrance-family system, and every answer is tied to a page on scento.com. No key, no account, read-only.

**Remote server:** `https://www.scento.com/mcp` (streamable HTTP, no authentication)
**Docs:** https://www.scento.com/developers

## Connect

| Client | How |
|---|---|
| Claude (web, desktop, mobile) | Settings, Connectors, Add custom connector. Paste `https://www.scento.com/mcp`. |
| ChatGPT | Settings, Connectors, create a connector in developer mode. Server URL `https://www.scento.com/mcp`, authentication none. |
| Cursor | Add to `~/.cursor/mcp.json`: `{"mcpServers":{"scento-perfume-compendium":{"url":"https://www.scento.com/mcp"}}}` |
| VS Code | Add to `.vscode/mcp.json`: `{"servers":{"scento-perfume-compendium":{"type":"http","url":"https://www.scento.com/mcp"}}}` |
| Claude Code | `claude mcp add --transport http scento-perfume-compendium https://www.scento.com/mcp` |

Clients that only run local servers can use the stdio bridge in this repo:

```sh
npx -y scento-perfume-compendium     # Node 18+
uvx scento-perfume-compendium        # Python 3.9+
```

Both accept `--endpoint <url>` (or `SCENTO_COMPENDIUM_ENDPOINT`).

## The twelve tools

| Tool | What it does |
|---|---|
| `compendium-search` | Find perfumes, houses and raw materials by name, house, note or mood word. |
| `perfume-portrait` | The full portrait of one perfume: pyramid, Scento family, character and when it wears best. |
| `scent-neighbours` | Perfumes that share the most structure with a given one, with the shared materials named. |
| `perfume-contrast` | Set two to four perfumes side by side on family, pyramid, character and season. |
| `note-portrait` | What a note or raw material is, where it comes from and how it reads on skin. |
| `material-match` | Perfumes that contain every material given, optionally in one tier of the pyramid. |
| `house-portrait` | A perfume house: origin, founding year, style and its signature perfumes. |
| `family-map` | Scento's own fragrance-family system, or one family with its subfamilies and exemplars. |
| `occasion-edit` | A short edit of perfumes for an occasion, season or climate, with a line on each. |
| `wardrobe-composer` | Three to five perfumes that cover different moments, built around what the person already loves. |
| `perfumery-lexicon` | Plain-language meaning of a perfumery term such as sillage, chypre, fougère or EDP versus EDT. |
| `journal-search` | Scento journal articles on a perfume, house, material or topic. |

Pass `lang` (de, fr, es, it, ro, el, hu, cs, pl) to receive scento.com links in that language.

## REST

The same answers are available over plain HTTP.

- API base: https://www.scento.com/api/compendium/v1
- OpenAPI: https://www.scento.com/api/compendium/v1/openapi.json

## Examples

Three raw JSON-RPC calls are in [`examples/`](examples/).

## Repository layout

- `npm/`: the Node stdio bridge, published as `scento-perfume-compendium` on npm
- `pypi/`: the Python stdio bridge, published as `scento-perfume-compendium` on PyPI
- `server.json`: metadata for the Official MCP Registry (`com.scento/perfume-compendium`)

## Licence

MIT for the bridge code in this repository. The Compendium content is served from scento.com under its [terms](https://www.scento.com/terms-of-service#perfume-compendium).

[Scento](https://www.scento.com)
