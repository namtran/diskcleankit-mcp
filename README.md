# DiskCleanKit MCP Server

[![npm version](https://badge.fury.io/js/@vannamtran%2Fdiskcleankit-mcp.svg)](https://www.npmjs.com/package/@vannamtran/diskcleankit-mcp)

MCP (Model Context Protocol) server that enables AI assistants like Claude to control DiskCleanKit's **One Touch** feature for Mac disk cleaning.

## Prerequisites

- macOS
- [DiskCleanKit](https://diskcleankit.com) app installed
- Node.js v18+

## Installation

### Via npm (Recommended)

```bash
npm install -g @vannamtran/diskcleankit-mcp
```

### From Source

```bash
git clone https://github.com/namtran/diskcleankit-mcp
cd diskcleankit-mcp
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "diskcleankit": {
      "command": "npx",
      "args": ["@vannamtran/diskcleankit-mcp"]
    }
  }
}
```

Then restart Claude Desktop.

### Claude Code (CLI)

```bash
claude mcp add --transport stdio diskcleankit -- npx @vannamtran/diskcleankit-mcp
```

Or edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "diskcleankit": {
      "command": "npx",
      "args": ["@vannamtran/diskcleankit-mcp"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-specific):

```json
{
  "mcpServers": {
    "diskcleankit": {
      "command": "npx",
      "args": ["@vannamtran/diskcleankit-mcp"]
    }
  }
}
```

Or go to **Cursor Settings → Tools & Integrations → New MCP Server**.

### VS Code (GitHub Copilot)

Add to your `settings.json`:

```json
{
  "mcp.servers": {
    "diskcleankit": {
      "command": "npx",
      "args": ["@vannamtran/diskcleankit-mcp"]
    }
  }
}
```

### Other MCP Clients

| Client | Config File |
|--------|-------------|
| Cline | VS Code extension settings |
| Windsurf | `~/.windsurf/mcp.json` |
| Zed | `~/.config/zed/settings.json` |
| Continue | `~/.continue/config.json` |

Use the same configuration structure:

```json
{
  "mcpServers": {
    "diskcleankit": {
      "command": "npx",
      "args": ["@vannamtran/diskcleankit-mcp"]
    }
  }
}
```

### Ollama (via mcphost)

Ollama doesn't natively support MCP, but you can use [mcphost](https://github.com/chrishayuk/mcp-cli):

```bash
pip install mcphost
mcphost -m ollama:qwen2.5 --config config.json
```

### Unsupported

- **ChatGPT**: No native MCP support

## Available Tools

| Tool | Description |
|------|-------------|
| `one_touch_scan` | **Default** - Scan for junk files (safe, no deletion) |
| `one_touch_clean` | Scan AND clean junk files automatically |
| `get_disk_status` | Check disk space and health status |
| `get_cleanable_estimate` | Estimate cleanable space by category |
| `get_cleaning_history` | View past cleaning sessions |

## Usage Examples

Once configured, ask your AI assistant:

- "Scan my Mac for junk files" → `one_touch_scan`
- "Clean up my Mac" → `one_touch_clean`
- "How much disk space do I have?" → `get_disk_status`
- "What can be cleaned?" → `get_cleanable_estimate`
- "Show my cleaning history" → `get_cleaning_history`

## How It Works

```
AI Assistant → MCP Server → URL Scheme → DiskCleanKit App
                   ↑                            ↓
              JSON Response ← Temp File ← Response
```

1. AI calls MCP server tools
2. MCP server triggers DiskCleanKit via `diskcleankit://` URL scheme
3. DiskCleanKit processes request and writes response to `/tmp/diskcleankit_mcp_response.json`
4. MCP server reads response and returns to AI

## Security

- `one_touch_scan` is safe - only scans, never deletes
- `one_touch_clean` automatically cleans items found by previous scan (no confirmation)
- All processing happens locally on your Mac
- No data sent to external servers

**Recommended workflow:**
1. Run `one_touch_scan` first to see what will be cleaned
2. Review the results with user
3. Run `one_touch_clean` only after user approval

## Troubleshooting

### "Timeout waiting for response"
- Ensure DiskCleanKit app is installed
- Try opening DiskCleanKit manually first

### Server not appearing in Claude
- Verify config path is correct
- Restart Claude Desktop after config changes
- Check Claude logs for errors

## License

MIT

## Links

- [DiskCleanKit App](https://diskcleankit.com)
- [MCP Protocol](https://modelcontextprotocol.io)
