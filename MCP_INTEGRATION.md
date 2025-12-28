# DiskCleanKit MCP Integration

This document describes how to integrate DiskCleanKit with AI chat tools using the Model Context Protocol (MCP).

## Overview

DiskCleanKit exposes its **One Touch** functionality through MCP, allowing AI assistants to:
- Scan for junk files (safe, no deletion)
- Run automatic disk cleanup (scan + clean)
- Check disk space status
- Estimate cleanable space
- View cleaning history

## Published Packages

| Platform | URL |
|----------|-----|
| **npm** | https://www.npmjs.com/package/@vannamtran/diskcleankit-mcp |
| **GitHub** | https://github.com/namtran/diskcleankit-mcp |
| **MCP Registry** | https://registry.modelcontextprotocol.io (search: `diskcleankit`) |

## Quick Start

### Option 1: Via npm (Recommended)

No build required! Just configure your AI client:

```bash
npx @vannamtran/diskcleankit-mcp
```

### Option 2: From Source

```bash
git clone https://github.com/namtran/diskcleankit-mcp
cd diskcleankit-mcp
npm install
npm run build
```

## AI Client Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

| Client | Config File | Support |
|--------|-------------|---------|
| Cline | VS Code extension settings | ✅ |
| Windsurf | `~/.windsurf/mcp.json` | ✅ |
| Zed | `~/.config/zed/settings.json` | ✅ |
| Continue | `~/.continue/config.json` | ✅ |

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

### Unsupported Clients

- **ChatGPT**: No native MCP support

## Available Tools

### 1. One Touch Scan (Safe)

Scans for junk files without deleting anything. **Recommended first step.**

```
Tool: one_touch_scan
Example: "Scan my Mac for junk files"
```

### 2. One Touch Clean

Automatically scans and cleans junk files, caches, logs, and system debris.

```
Tool: one_touch_clean
Example: "Clean up my Mac" or "Run disk cleanup"
```

### 3. Get Disk Status

Returns current disk space information and health status.

```
Tool: get_disk_status
Example: "How much disk space do I have?"
```

**Response includes:**
- Total, free, and used space
- Usage percentage
- Health status (healthy, caution, warning, critical)
- Recommendations

### 4. Get Cleanable Estimate

Estimates how much space can be cleaned.

```
Tool: get_cleanable_estimate
Example: "What can be cleaned on my Mac?"
```

**Response includes:**
- Estimated cleanable space by category
- System caches, logs, Xcode data, trash, simulators

### 5. Get Cleaning History

Returns cleaning history and statistics.

```
Tool: get_cleaning_history
Example: "Show my cleaning history"
```

**Response includes:**
- Total space freed over time
- Number of cleaning sessions
- Average session size
- Recent session details

## URL Scheme (Direct Access)

You can also trigger operations directly via URL scheme:

```bash
# Run One Touch Scan (safe)
open "diskcleankit://mcp/action?name=one_touch_scan"

# Run One Touch Clean
open "diskcleankit://mcp/action?name=one_touch_clean"

# Get disk status
open "diskcleankit://mcp/disk_status"

# Get cleanable estimate
open "diskcleankit://mcp/cleanable_estimate"

# Get cleaning history
open "diskcleankit://mcp/cleaning_history?limit=10"
```

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

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "appVersion": "5.0.0",
  "operation": "disk_status",
  "data": {
    "type": "disk_status",
    "payload": {
      "totalSpace": 500000000000,
      "totalSpaceFormatted": "500 GB",
      "freeSpace": 45000000000,
      "freeSpaceFormatted": "45 GB",
      "usedSpace": 455000000000,
      "usedSpaceFormatted": "455 GB",
      "usedPercentage": 91,
      "healthStatus": "warning",
      "recommendation": "Disk is almost full. Consider running a cleanup."
    }
  },
  "error": null
}
```

## Response Locations

Responses are available at:
1. **Temp File** (primary): `/tmp/diskcleankit_mcp_response.json`
2. **Sandbox Container**: `~/Library/Containers/com.mitsoftware.macCleaner/Data/Library/Application Support/DiskCleanKit/mcp_response.json`
3. **Clipboard**: JSON copied automatically

## Example AI Conversations

```
User: My Mac is running slow, can you help?
AI: Let me check your disk space first.
[Uses get_disk_status tool]
AI: Your disk is 91% full with only 45 GB free. This could affect performance.
    Would you like me to scan for junk files?

User: Yes, please scan
AI: [Uses one_touch_scan tool]
AI: Found 15 GB of cleanable files including:
    - System caches: 8 GB
    - Application logs: 3 GB
    - Xcode derived data: 4 GB
    Would you like me to clean these?

User: Yes, clean them
AI: [Uses one_touch_clean tool]
AI: Cleanup complete! Freed up 15 GB of disk space.

User: How much have I cleaned in the past?
AI: [Uses get_cleaning_history tool]
AI: You've freed up 127 GB total across 15 cleaning sessions.
    Most commonly cleaned: System Caches.
```

## Security Notes

- MCP queries are read-only by default
- `one_touch_scan` is safe - only scans, never deletes
- `one_touch_clean` cleans immediately without confirmation (use after scan + user approval)
- No data is sent to external servers
- All processing happens locally on your Mac

**Recommended AI workflow:**
1. Run `one_touch_scan` first to see what will be cleaned
2. Show results to user and ask for approval
3. Only run `one_touch_clean` after explicit user consent

## Data Export

Cleaning history can be exported for analysis:

### JSON Export
```swift
let jsonData = MCPIntegrationService.shared.exportHistoryJSON()
```

### CSV Export
```swift
let csvString = MCPIntegrationService.shared.exportHistoryCSV()
```

## Version History

- **1.0.1**: Documentation update
  - Added comprehensive AI client configuration guides
  - Support for Cursor, VS Code, Cline, Windsurf, Zed, Continue
  - Ollama integration via mcphost

- **1.0.0**: Initial public release
  - Published to npm as `@vannamtran/diskcleankit-mcp`
  - Published to MCP Registry as `io.github.namtran/diskcleankit-mcp`
  - One Touch Scan (safe scan without deletion)
  - One Touch Clean (scan + clean)
  - Disk status queries
  - Cleaning history export
  - Cleanable estimate

## Links

- [DiskCleanKit App](https://diskcleankit.com)
- [npm Package](https://www.npmjs.com/package/@vannamtran/diskcleankit-mcp)
- [GitHub Repository](https://github.com/namtran/diskcleankit-mcp)
- [MCP Protocol](https://modelcontextprotocol.io)
- [MCP Registry](https://registry.modelcontextprotocol.io)
