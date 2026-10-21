<!-- mcp-name: com.scento/perfume-compendium -->

# Scento Perfume Compendium: Perfume MCP server and Fragrance API

Free perfume and fragrance API and MCP server for AI assistants, from [Scento](https://www.scento.com). Ask Claude, ChatGPT, Cursor or any MCP client for a perfume's notes, the difference between two you are torn over, similar scents built on the same structure, or what a raw material such as ambroxan smells like. Every answer is tied to a page on scento.com. No key, no account, read-only.

This package is a small local bridge (Python 3.9 or later, no dependencies beyond the standard library). It speaks MCP over stdio for clients that only run local servers, and relays each message to the Compendium at `https://www.scento.com/mcp`.

## Install the perfume MCP server

Add it to your client's MCP configuration (Claude Desktop `claude_desktop_config.json`, Cursor `~/.cursor/mcp.json`, VS Code `.vscode/mcp.json` using `servers` in place of `mcpServers`, Windsurf and others):

```json
{
  "mcpServers": {
    "scento-perfume-compendium": {
      "command": "uvx",
      "args": ["scento-perfume-compendium"]
    }
  }
}
```

Or run the command yourself:

```sh
uvx scento-perfume-compendium
```

Prefer pip? Install with `pip install scento-perfume-compendium` and point the config at the `scento-perfume-compendium` command.

Check it from a terminal:

```sh
uvx scento-perfume-compendium --help
```

Use another endpoint with `--endpoint <url>`.

## No bridge needed?

Most clients can talk to the Compendium directly. Add the remote URL as a custom connector (Claude, ChatGPT) or as an HTTP server:

```json
{
  "mcpServers": {
    "scento-perfume-compendium": {
      "type": "http",
      "url": "https://www.scento.com/mcp"
    }
  }
}
```

Prefer plain HTTP? The same answers are on the [REST API](https://www.scento.com/api/compendium/v1) with an [OpenAPI file](https://www.scento.com/api/compendium/v1/openapi.json).

## Twelve perfume and fragrance tools

| Tool | What it does |
|---|---|
| `compendium-search` | Find perfumes, houses and raw materials in the Scento Compendium by name, house, note or mood word. |
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

## Links

- Developers page: https://www.scento.com/developers
- Scento: https://www.scento.com

Scento is a perfume decant house founded in Paris in 2024. MIT licence (this bridge only).
