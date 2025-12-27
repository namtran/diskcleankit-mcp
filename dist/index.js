#!/usr/bin/env node
/**
 * DiskCleanKit MCP Server
 *
 * This MCP server enables AI assistants like Claude to interact with DiskCleanKit
 * for disk cleaning operations using One Touch Clean.
 *
 * Tools:
 * - one_touch_clean: Run automatic scan and clean
 * - get_disk_status: Check current disk space
 * - get_cleanable_estimate: Estimate cleanable space
 * - get_cleaning_history: View past cleaning sessions
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
const execAsync = promisify(exec);
// Response file locations (check multiple for sandbox compatibility)
const RESPONSE_FILES = [
    "/tmp/diskcleankit_mcp_response.json",
    `${os.homedir()}/Library/Application Support/DiskCleanKit/mcp_response.json`,
    // Sandboxed app container location
    `${os.homedir()}/Library/Containers/com.mitsoftware.macCleaner/Data/Library/Application Support/DiskCleanKit/mcp_response.json`,
];
// Helper to wait for response file
async function waitForResponse(timeoutMs = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        // Check all possible response file locations
        for (const responseFile of RESPONSE_FILES) {
            try {
                if (fs.existsSync(responseFile)) {
                    const stat = fs.statSync(responseFile);
                    // Check if file was modified recently (within last 10 seconds)
                    if (Date.now() - stat.mtimeMs < 10000) {
                        const content = fs.readFileSync(responseFile, "utf-8");
                        return JSON.parse(content);
                    }
                }
            }
            catch (e) {
                // Continue checking other locations
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error("Timeout waiting for DiskCleanKit response");
}
// Helper to execute DiskCleanKit URL scheme
async function executeDiskCleanKitCommand(operation, params = {}) {
    let url = `diskcleankit://mcp/${operation}`;
    if (Object.keys(params).length > 0) {
        const queryString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join("&");
        url += `?${queryString}`;
    }
    // Remove old response files from all locations
    for (const responseFile of RESPONSE_FILES) {
        try {
            if (fs.existsSync(responseFile)) {
                fs.unlinkSync(responseFile);
            }
        }
        catch (e) {
            // Ignore - file might not exist or be inaccessible
        }
    }
    // Open URL scheme in background (-g flag prevents app from coming to front)
    await execAsync(`open -g "${url}"`);
    // Wait for response
    return await waitForResponse();
}
// Define available tools
const tools = [
    {
        name: "one_touch_scan",
        description: "Run DiskCleanKit One Touch Scan - automatically scans your Mac for junk files, caches, logs, and system debris. Shows what can be cleaned WITHOUT deleting anything. Always run this first before cleaning.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "one_touch_clean",
        description: "Run DiskCleanKit One Touch Clean - automatically cleans the items found by the previous scan. WARNING: This deletes files immediately without confirmation. Always run one_touch_scan first and get user approval before calling this.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "get_disk_status",
        description: "Get current disk space status including total space, free space, used space, usage percentage, and health status (healthy/warning/critical).",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "get_cleanable_estimate",
        description: "Estimate how much space can be cleaned by One Touch Clean. Returns breakdown by category (caches, logs, Xcode data, trash, etc.).",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "get_cleaning_history",
        description: "Get history of past cleaning sessions including total space freed, number of sessions, and details of recent cleans. Use this to answer 'how much did I clean last week?'",
        inputSchema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Maximum number of sessions to return (default: 10)",
                },
            },
            required: [],
        },
    },
    {
        name: "get_storage_breakdown",
        description: "Get detailed storage breakdown by category (Documents, Downloads, Developer, Caches, etc.). Use this to answer 'What's eating my disk space?' with specific category sizes.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "get_large_files",
        description: "Find large files on the Mac. Returns a list of the biggest files with their paths, sizes, and types. Use this to answer 'what are these large files?' or 'find big files'.",
        inputSchema: {
            type: "object",
            properties: {
                min_size_mb: {
                    type: "number",
                    description: "Minimum file size in MB to include (default: 100)",
                },
                limit: {
                    type: "number",
                    description: "Maximum number of files to return (default: 20)",
                },
            },
            required: [],
        },
    },
    {
        name: "get_dev_caches",
        description: "Analyze developer tool caches: Xcode derived data, iOS simulators, npm, Yarn, CocoaPods, Homebrew, Gradle, Maven, Docker. Use this to answer 'clean all my dev caches' or help developers specifically.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    // Visual mode tools - these open the DiskCleanKit app UI
    {
        name: "show_disk_manager",
        description: "Open DiskCleanKit's Disk Manager screen and auto-scan the system disk. Shows visual storage breakdown with charts. Use this when user wants to SEE their disk usage, or for first-time demos.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "show_one_touch",
        description: "Open DiskCleanKit's One Touch Clean screen. Brings app to front for user interaction. Use this when user wants to manually control the cleaning process.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "show_cleaning_history",
        description: "Open DiskCleanKit's Cleaning History screen. Shows past cleaning sessions with charts and statistics. Use this when user wants to visually review their cleaning history.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "show_dashboard",
        description: "Open DiskCleanKit's main Dashboard. Shows overview of disk health, quick actions, and recommendations. Use this as a general entry point to show the app.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
];
// Create server
const server = new Server({
    name: "diskcleankit",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "one_touch_scan": {
                const response = await executeDiskCleanKitCommand("action", { name: "one_touch_scan" });
                return {
                    content: [
                        {
                            type: "text",
                            text: `One Touch Scan initiated! DiskCleanKit is scanning your Mac for cleanable files.\n\nThis is safe - nothing will be deleted. Review the results before running one_touch_clean.\n\n${JSON.stringify(response, null, 2)}`,
                        },
                    ],
                };
            }
            case "one_touch_clean": {
                const response = await executeDiskCleanKitCommand("action", { name: "one_touch_clean" });
                return {
                    content: [
                        {
                            type: "text",
                            text: `One Touch Clean initiated! DiskCleanKit is now cleaning the items found by the previous scan.\n\nFiles are being deleted immediately.\n\n${JSON.stringify(response, null, 2)}`,
                        },
                    ],
                };
            }
            case "get_disk_status": {
                const response = await executeDiskCleanKitCommand("disk_status");
                if (response.success && response.data?.payload) {
                    const data = response.data.payload;
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Disk Status:
- Total Space: ${data.totalSpaceFormatted}
- Used Space: ${data.usedSpaceFormatted} (${data.usedPercentage}%)
- Free Space: ${data.freeSpaceFormatted}
- Health: ${data.healthStatus}
${data.recommendation ? `- Recommendation: ${data.recommendation}` : ""}`,
                            },
                        ],
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
                };
            }
            case "get_cleanable_estimate": {
                const response = await executeDiskCleanKitCommand("cleanable_estimate");
                if (response.success && response.data?.payload) {
                    const data = response.data.payload;
                    let text = `Cleanable Space Estimate: ${data.totalCleanableFormatted}\n\nBreakdown:`;
                    for (const cat of data.categories || []) {
                        text += `\n- ${cat.name}: ${cat.estimatedSizeFormatted}`;
                    }
                    if (data.note) {
                        text += `\n\nNote: ${data.note}`;
                    }
                    return {
                        content: [{ type: "text", text }],
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
                };
            }
            case "get_cleaning_history": {
                const limit = args?.limit || 10;
                const response = await executeDiskCleanKitCommand("cleaning_history", { limit: String(limit) });
                if (response.success && response.data?.payload) {
                    const data = response.data.payload;
                    const stats = data.statistics;
                    let text = `Cleaning History Summary:
- Total Space Freed: ${stats.totalSpaceFreedFormatted}
- Total Sessions: ${stats.totalSessions}
- Total Items Cleaned: ${stats.totalItemsCleaned}
- Average Per Session: ${stats.averageSessionSizeFormatted}
- Most Cleaned: ${stats.mostCleanedCategory || "N/A"}
- Last Cleaning: ${stats.lastCleaningDate || "Never"}`;
                    if (data.recentSessions?.length > 0) {
                        text += "\n\nRecent Sessions:";
                        for (const session of data.recentSessions.slice(0, 5)) {
                            text += `\n- ${session.date}: ${session.spaceFreedFormatted} (${session.itemsCleaned} items)`;
                        }
                    }
                    return {
                        content: [{ type: "text", text }],
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
                };
            }
            case "get_storage_breakdown": {
                const response = await executeDiskCleanKitCommand("storage_breakdown");
                if (response.success && response.data?.payload) {
                    const data = response.data.payload;
                    let text = `Storage Breakdown - What's Eating Your Disk Space:\n`;
                    for (const cat of data.categories || []) {
                        const bar = "█".repeat(Math.floor(cat.percentage / 5)) + "░".repeat(20 - Math.floor(cat.percentage / 5));
                        text += `\n${cat.name}: ${cat.sizeFormatted} (${cat.percentage.toFixed(1)}%)\n  ${bar}`;
                    }
                    if (data.largestCategory) {
                        text += `\n\n💡 Largest category: ${data.largestCategory}`;
                    }
                    return {
                        content: [{ type: "text", text }],
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
                };
            }
            case "get_large_files": {
                const minSizeMb = args?.min_size_mb || 100;
                const limit = args?.limit || 20;
                const response = await executeDiskCleanKitCommand("large_files", {
                    min_size_mb: String(minSizeMb),
                    limit: String(limit),
                });
                if (response.success && response.data?.payload) {
                    const data = response.data.payload;
                    let text = `Large Files Found (>${minSizeMb}MB):\n`;
                    for (const file of data.categories || []) {
                        text += `\n- ${file.name}: ${file.sizeFormatted}`;
                    }
                    return {
                        content: [{ type: "text", text }],
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
                };
            }
            case "get_dev_caches": {
                const response = await executeDiskCleanKitCommand("dev_caches");
                if (response.success && response.data?.payload) {
                    const data = response.data.payload;
                    let text = `Developer Tools Cache Analysis:\n\nTotal: ${data.totalCleanableFormatted}\n\nBreakdown:`;
                    for (const cat of data.categories || []) {
                        text += `\n- ${cat.name}: ${cat.estimatedSizeFormatted}`;
                        if (cat.description) {
                            text += `\n  └─ ${cat.description}`;
                        }
                    }
                    text += `\n\n${data.note || ""}`;
                    return {
                        content: [{ type: "text", text }],
                    };
                }
                return {
                    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
                };
            }
            // Visual mode tools - open app UI
            case "show_disk_manager": {
                const response = await executeDiskCleanKitCommand("action", { name: "show_disk_manager" });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Opening DiskCleanKit Disk Manager...\n\nThe app will analyze your disk storage and show a visual breakdown. This helps users understand what's using their space.\n\n${JSON.stringify(response, null, 2)}`,
                        },
                    ],
                };
            }
            case "show_one_touch": {
                const response = await executeDiskCleanKitCommand("action", { name: "show_one_touch" });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Opening DiskCleanKit One Touch Clean...\n\nThe app is now in the foreground. User can manually start scanning and cleaning.\n\n${JSON.stringify(response, null, 2)}`,
                        },
                    ],
                };
            }
            case "show_cleaning_history": {
                const response = await executeDiskCleanKitCommand("action", { name: "show_cleaning_history" });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Opening DiskCleanKit Cleaning History...\n\nShowing past cleaning sessions with charts and statistics.\n\n${JSON.stringify(response, null, 2)}`,
                        },
                    ],
                };
            }
            case "show_dashboard": {
                const response = await executeDiskCleanKitCommand("action", { name: "show_dashboard" });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Opening DiskCleanKit Dashboard...\n\nThe main dashboard shows disk health overview and quick actions.\n\n${JSON.stringify(response, null, 2)}`,
                        },
                    ],
                };
            }
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}\n\nMake sure DiskCleanKit is installed and running.`,
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("DiskCleanKit MCP Server running on stdio");
}
main().catch(console.error);
