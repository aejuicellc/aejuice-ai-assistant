#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const hostNames = { ae: "After Effects", ppro: "Premiere Pro", standalone: "Pack Manager Standalone" };
const requestTimeoutMs = 60000;

function getDiscoveryFolder() {
  if (process.platform == "win32") {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "AEJuice", "mcp");
  }
  return path.join(os.homedir(), "Library", "Application Support", "AEJuice", "mcp");
}

function readInstances() {
  const folder = getDiscoveryFolder();
  if (!fs.existsSync(folder)) return [];
  const instances = [];
  for (const name of fs.readdirSync(folder)) {
    if (!name.endsWith(".json")) continue;
    try {
      instances.push(JSON.parse(fs.readFileSync(path.join(folder, name), "utf8")));
    } catch (error) {
      continue;
    }
  }
  return instances;
}

async function callPackManager(instance, method, body) {
  const response = await fetch("http://127.0.0.1:" + instance.port + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body == null ? {} : body),
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  const text = await response.text();
  const json = text.length ? JSON.parse(text) : null;
  if (Array.isArray(json)) return json;
  if (json && (json.status == "success" || json.status == "ok")) return json.result;
  throw new Error((json && json.error) || "Pack Manager did not answer " + method);
}

async function getInstance(host) {
  const alive = [];
  for (const instance of readInstances()) {
    try {
      const status = await callPackManager(instance, "McpStatus");
      alive.push({ ...instance, ...status });
    } catch (error) {
      continue;
    }
  }
  if (alive.length == 0) {
    throw new Error("Pack Manager is not open. Open AEJuice Pack Manager 4 in After Effects (Window menu), Premiere Pro (Window > Extensions) or the Standalone app.");
  }
  if (host) {
    const match = alive.find(function(instance) { return instance.host == host; });
    if (!match) throw new Error("Pack Manager is not open in " + hostNames[host] + ".");
    return match;
  }
  return alive[0];
}

function asText(value) {
  return { content: [{ type: "text", text: typeof value == "string" ? value : JSON.stringify(value, null, 2) }] };
}

const hostSchema = z.enum(["ae", "ppro", "standalone"]).optional()
  .describe("Which app to use: ae = After Effects, ppro = Premiere Pro, standalone = Standalone app. Empty = the first open one");

const server = new McpServer({ name: "aejuice", version: "0.1.0" });

server.registerTool("status", {
  title: "Pack Manager status",
  description: "Which apps have AEJuice Pack Manager open, the app version and whether the user is signed in",
  inputSchema: {},
  annotations: { readOnlyHint: true }
}, async function() {
  const result = [];
  for (const instance of readInstances()) {
    try {
      const status = await callPackManager(instance, "McpStatus");
      result.push({ app: hostNames[status.host] || status.host, host: status.host, version: status.appVersion, signedIn: status.loggedIn, email: status.email });
    } catch (error) {
      continue;
    }
  }
  return asText(result.length ? result : "Pack Manager is not open in any app.");
});

server.registerTool("search_items", {
  title: "Search AEJuice items",
  description: "Search the whole AEJuice library (titles, transitions, effects, sound effects...) by description. Returns pack, item name, preview video and whether the user owns the pack",
  inputSchema: {
    query: z.string().describe("What to look for, e.g. 'glitch transition' or 'neon lower third'"),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum items, default 20"),
    host: hostSchema
  },
  annotations: { readOnlyHint: true }
}, async function({ query, limit, host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "McpSearch", { query: query, limit: limit || 20 }));
});

server.registerTool("list_owned_packs", {
  title: "List owned packs",
  description: "Packs the signed-in user can use: purchased and free",
  inputSchema: { host: hostSchema },
  annotations: { readOnlyHint: true }
}, async function({ host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "ExtObjGetLicenses"));
});

server.registerTool("import_items", {
  title: "Import items",
  description: "Import items into the open After Effects comp or Premiere Pro sequence (or download them in Standalone). Items are matched by exact item name from search_items. Only owned packs can be imported",
  inputSchema: {
    pack: z.string().describe("Pack name exactly as returned by search_items"),
    items: z.array(z.string()).min(1).describe("Item names exactly as returned by search_items"),
    host: hostSchema
  },
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async function({ pack, items, host }) {
  const instance = await getInstance(host);
  await callPackManager(instance, "McpImport", [{ pack: pack, animations: items }]);
  return asText("Import started in " + (hostNames[instance.host] || instance.host) + ": " + items.join(", ") + " from " + pack);
});

server.registerTool("import_status", {
  title: "Import status",
  description: "Whether an import started with import_items is still running",
  inputSchema: { host: hostSchema },
  annotations: { readOnlyHint: true }
}, async function({ host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "McpImportStatus"));
});

server.registerTool("download_pack", {
  title: "Download a whole pack",
  description: "Download all files of an owned pack so every item imports instantly and works offline. Check progress with download_status",
  inputSchema: {
    pack: z.string().describe("Pack name exactly as returned by search_items or list_owned_packs"),
    host: hostSchema
  },
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async function({ pack, host }) {
  const instance = await getInstance(host);
  await callPackManager(instance, "McpDownloadPack", { pack: pack });
  return asText("Download started: " + pack + ". Use download_status to follow it.");
});

server.registerTool("download_status", {
  title: "Download status",
  description: "Progress of a pack download started with download_pack: state (downloading, done, failed, not started) and percent",
  inputSchema: { pack: z.string(), host: hostSchema },
  annotations: { readOnlyHint: true }
}, async function({ pack, host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "McpDownloadStatus", { pack: pack }));
});

server.registerTool("get_settings", {
  title: "Get Pack Manager settings",
  description: "Current settings. packManager: interface and behavior options (Show* = which buttons and parts are visible, MinimalMode, BalancedMode, TabsLimit, EditAfterImport 0 Smart 1 Quick edit 2 Edit window 3 Nothing, ImportWithAudio, LoopFootage...; null = default). advanced: Advanced tab settings with name, type, allowed values and description",
  inputSchema: { host: hostSchema },
  annotations: { readOnlyHint: true }
}, async function({ host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "McpGetSettings"));
});

server.registerTool("update_settings", {
  title: "Change Pack Manager settings",
  description: "Change settings returned by get_settings. Interface changes show after reopening Pack Manager",
  inputSchema: {
    packManager: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
      .describe("Keys from get_settings packManager with new values, e.g. {\"ShowTrending\": false, \"TabsLimit\": 5}"),
    advanced: z.array(z.object({ settingName: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) })).optional()
      .describe("Advanced settings by settingName from get_settings advanced"),
    host: hostSchema
  },
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async function({ packManager, advanced, host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "McpSetSettings", { packManager: packManager || {}, advanced: advanced || [] }));
});

server.registerTool("get_item_controls", {
  title: "Get controls of the selected item",
  description: "Editable controls of the selected AEJuice item (select its layer in After Effects or its clip in Premiere Pro first; an item is selected right after import_items): texts, fonts, colors as [r,g,b] 0-1, sliders, checkboxes, dropdowns",
  inputSchema: { host: hostSchema },
  annotations: { readOnlyHint: true }
}, async function({ host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "McpGetControls"));
});

server.registerTool("set_item_controls", {
  title: "Edit the selected item",
  description: "Change controls of the selected AEJuice item by control name from get_item_controls: text, font (font name as in get_item_controls), color [r,g,b], numbers, true/false",
  inputSchema: {
    changes: z.array(z.object({
      name: z.string(),
      value: z.any().optional(),
      font: z.string().optional()
    })).min(1),
    host: hostSchema
  },
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async function({ changes, host }) {
  const instance = await getInstance(host);
  return asText(await callPackManager(instance, "McpSetControls", { changes: changes }));
});

await server.connect(new StdioServerTransport());
