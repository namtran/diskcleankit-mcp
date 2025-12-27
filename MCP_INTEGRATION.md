# DiskCleanKit MCP Integration

This document describes how to integrate DiskCleanKit with AI chat tools (Claude, ChatGPT, etc.) using the Model Context Protocol (MCP).

## Overview

DiskCleanKit exposes its **One Touch Clean** functionality through MCP, allowing AI assistants to:
- Run automatic disk cleanup (scan + clean)
- Check disk space status
- Estimate cleanable space
- View cleaning history

## Quick Start: Free MCP Server Setup

### 1. Install Prerequisites

```bash
# Install Node.js (if not installed)
brew install node
```

### 2. Build the MCP Server

```bash
cd /path/to/MacCleaner/MCP
npm install
npm run build
```

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "diskcleankit": {
      "command": "node",
      "args": ["/path/to/MacCleaner/MCP/dist/index.js"]
    }
  }
}
```

### 4. Restart Claude Desktop

The DiskCleanKit tools will now be available to Claude.

## Available Tools

### 1. One Touch Clean (Primary)

Automatically scans and cleans junk files, caches, logs, and system debris.

```
Tool: one_touch_clean
Example: "Clean up my Mac" or "Run disk cleanup"
```

### 2. Get Disk Status

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

### 3. Get Cleanable Estimate

Estimates how much space can be cleaned.

```
Tool: get_cleanable_estimate
Example: "What can be cleaned on my Mac?"
```

**Response includes:**
- Estimated cleanable space by category
- System caches, logs, Xcode data, trash, simulators

### 4. Get Cleaning History

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
# Run One Touch Clean
open "diskcleankit://mcp/action?name=one_touch_clean"

# Get disk status
open "diskcleankit://mcp/disk_status"

# Get cleanable estimate
open "diskcleankit://mcp/cleanable_estimate"

# Get cleaning history
open "diskcleankit://mcp/cleaning_history?limit=10"
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "appVersion": "4.1.0",
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
1. **Sandbox Container** (primary): `~/Library/Containers/com.mitsoftware.macCleaner/Data/Library/Application Support/DiskCleanKit/mcp_response.json`
2. **Temp File** (if not sandboxed): `/tmp/diskcleankit_mcp_response.json`
3. **Clipboard**: JSON copied automatically

## Example AI Conversations

```
User: My Mac is running slow, can you help?
AI: Let me check your disk space first.
[Uses get_disk_status tool]
AI: Your disk is 91% full with only 45 GB free. This could affect performance.
    Would you like me to run One Touch Clean to free up space?

User: Yes, please clean it up
AI: [Uses one_touch_clean tool]
AI: One Touch Clean has been initiated in DiskCleanKit.
    The app will scan and clean junk files automatically.

User: How much have I cleaned in the past?
AI: [Uses get_cleaning_history tool]
AI: You've freed up 127 GB total across 15 cleaning sessions.
    Most commonly cleaned: System Caches.
```

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

## Version History

- **4.1.0**: Initial MCP integration
  - One Touch Clean as primary action
  - Disk status queries
  - Cleaning history export
  - Cleanable estimate
