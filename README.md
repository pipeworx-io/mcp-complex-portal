# mcp-complex-portal

EBI Complex Portal MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_complexes` | Search the EBI Complex Portal — a manually curated database of stable macromolecular protein complexes — by protein/complex name, gene, GO term, or biological process (e.g. "apoptosis", "SCF", "ribosome"). Returns matching complexes with their accession (e.g. CPX-7762), name, description, and organism. Keyless. Complements UniProt/IntAct/STRING. |
| `get_complex` | Get a single Complex Portal record by its accession (e.g. CPX-7762). Returns the complex's participants (subunits) with UniProt identifiers, biological roles and stoichiometry, plus systematic name, function, species, and description. Keyless. Complements UniProt/IntAct/STRING. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "complex-portal": {
      "url": "https://gateway.pipeworx.io/complex-portal/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Complex Portal data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
