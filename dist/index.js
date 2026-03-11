#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_yargs = __toESM(require("yargs"));
var import_helpers = require("yargs/helpers");

// src/config.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var CONFIG_DIR = path.join(os.homedir(), ".melies");
var CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}
function loadConfig() {
  const envToken = process.env.MELIES_TOKEN;
  const envApiUrl = process.env.MELIES_API_URL;
  let fileConfig = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
    }
  }
  return {
    token: envToken || fileConfig.token,
    apiUrl: envApiUrl || fileConfig.apiUrl || "https://melies.co/api"
  };
}
function saveConfig(config) {
  ensureConfigDir();
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  const toSave = {};
  if (merged.token) toSave.token = merged.token;
  if (merged.apiUrl && merged.apiUrl !== "https://melies.co/api") {
    toSave.apiUrl = merged.apiUrl;
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2));
}
function getToken() {
  const config = loadConfig();
  if (!config.token) {
    console.error("Not logged in. Run: melies login");
    process.exit(1);
  }
  return config.token;
}

// src/api.ts
var MeliesAPI = class {
  constructor(token) {
    const config = loadConfig();
    this.apiUrl = config.apiUrl;
    this.token = token || config.token;
  }
  async request(path2, options = {}) {
    const { method = "GET", body, query, token } = options;
    const authToken = token || this.token;
    const headers = {
      "Content-Type": "application/json"
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    const fetchOptions = { method, headers };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    let url = `${this.apiUrl}${path2}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== void 0 && v !== null) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const text = await response.text();
      let errorMsg;
      try {
        const json = JSON.parse(text);
        errorMsg = json.error?.message || json.statusMessage || json.error || text;
      } catch {
        errorMsg = text;
      }
      throw new Error(`API error (${response.status}): ${errorMsg}`);
    }
    return response.json();
  }
  // Auth
  async login(email, password) {
    return this.request("/user/login", {
      method: "POST",
      body: { email, password }
    });
  }
  // User
  async getUser() {
    return this.request("/user", { method: "GET" });
  }
  // Credits
  async getCreditStats(granularity) {
    return this.request("/user/credits/stats", {
      method: "POST",
      body: { granularity: granularity || "month" }
    });
  }
  // Models (V2, public, no auth needed)
  async getModels(type) {
    return this.request("/v2/models", { method: "GET" });
  }
  // V2 Tool execution (image, video, poster)
  async executeTool(toolId, params) {
    return this.request(`/v2/tools/${toolId}`, {
      method: "POST",
      body: params
    });
  }
  // References (actors, objects)
  async getReferences() {
    return this.request("/v2/references", { method: "GET" });
  }
  async generateReference(imageUrls, label, type = "actor") {
    return this.request("/v2/references/generate", {
      method: "POST",
      body: { imageUrls, label, type }
    });
  }
  async createReference(label, type, thumbnailUrl, fullUrl) {
    return this.request("/v2/references", {
      method: "POST",
      body: { label, type, thumbnailUrl, fullUrl, r2Url: fullUrl }
    });
  }
  async deleteReference(id) {
    return this.request(`/v2/references/${id}`, { method: "DELETE" });
  }
  // V2 Assets
  async getAssets(options) {
    return this.request("/v2/assets", {
      method: "GET",
      query: {
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        ...options?.toolId ? { toolId: options.toolId } : {}
      }
    });
  }
};

// src/commands/login.ts
var readline = __toESM(require("readline"));
function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    if (hidden) {
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      process.stdout.write(question);
      let input = "";
      const onData = (char) => {
        const c = char.toString();
        if (c === "\n" || c === "\r") {
          stdin.removeListener("data", onData);
          if (stdin.isTTY && wasRaw !== void 0) {
            stdin.setRawMode(wasRaw);
          }
          process.stdout.write("\n");
          rl.close();
          resolve(input);
        } else if (c === "") {
          process.exit(0);
        } else if (c === "\x7F" || c === "\b") {
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += c;
        }
      };
      stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}
var loginCommand = {
  command: "login",
  describe: "Log in to Melies and store your auth token",
  builder: (yargs2) => yargs2.option("email", {
    alias: "e",
    type: "string",
    description: "Your Melies email"
  }).option("password", {
    alias: "p",
    type: "string",
    description: "Your Melies password"
  }).option("token", {
    alias: "t",
    type: "string",
    description: "Provide a JWT token directly (skip email/password)"
  }),
  handler: async (argv) => {
    try {
      if (argv.token) {
        saveConfig({ token: argv.token });
        console.log(JSON.stringify({ success: true, message: "Token saved" }));
        return;
      }
      const email = argv.email || await prompt("Email: ");
      const password = argv.password || await prompt("Password: ", true);
      if (!email || !password) {
        console.error(JSON.stringify({ error: "Email and password are required" }));
        process.exit(1);
      }
      const api = new MeliesAPI();
      const result = await api.login(email, password);
      if (result.token) {
        saveConfig({ token: result.token });
        console.log(JSON.stringify({
          success: true,
          user: result.user.name || result.user.email,
          plan: result.user.accountIds?.[0]?.plan || "free"
        }));
      } else {
        console.error(JSON.stringify({ error: "Login failed. Check your credentials." }));
        process.exit(1);
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/credits.ts
var creditsCommand = {
  command: "credits",
  describe: "Check credit balance and usage stats",
  builder: (yargs2) => yargs2.option("granularity", {
    alias: "g",
    type: "string",
    choices: ["day", "week", "month"],
    default: "month",
    description: "Granularity for usage stats"
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const { user } = await api.getUser();
      const account = user.accountIds?.[0];
      const { stats } = await api.getCreditStats(argv.granularity);
      console.log(JSON.stringify({
        plan: account?.plan || "free",
        credits: account?.credits ?? 0,
        usage: stats
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/models.ts
var modelsCommand = {
  command: "models",
  describe: "List available AI models (no auth needed)",
  builder: (yargs2) => yargs2.option("type", {
    alias: "t",
    type: "string",
    choices: ["image", "video", "sound", "sound_effect"],
    description: "Filter by model type"
  }),
  handler: async (argv) => {
    try {
      const api = new MeliesAPI();
      const { models } = await api.getModels();
      let filtered = models;
      if (argv.type) {
        filtered = models.filter((m) => m.type === argv.type);
      }
      const output = filtered.map((m) => ({
        id: m.id || m.model,
        name: m.name,
        type: m.type,
        credits: m.credits ?? null
      }));
      console.log(JSON.stringify(output, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/image.ts
var imageCommand = {
  command: "image <prompt>",
  describe: "Generate an image from a text prompt",
  builder: (yargs2) => yargs2.positional("prompt", {
    type: "string",
    description: "Text prompt describing the image",
    demandOption: true
  }).option("model", {
    alias: "m",
    type: "string",
    default: "flux-schnell",
    description: 'Image model to use (run "melies models" to see all)'
  }).option("aspectRatio", {
    alias: "a",
    type: "string",
    default: "1:1",
    description: "Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)"
  }).option("numOutputs", {
    alias: "n",
    type: "number",
    default: 1,
    description: "Number of images to generate (1-4)"
  }).option("resolution", {
    alias: "r",
    type: "string",
    description: "Output resolution (model-dependent)"
  }).option("imageUrl", {
    alias: "i",
    type: "string",
    description: "Reference image URL for image-to-image generation"
  }).option("ref", {
    type: "string",
    description: "Reference ID (actor/object) to use for consistent characters"
  }).option("sync", {
    alias: "s",
    type: "boolean",
    default: false,
    description: "Wait for generation to complete and return the URL"
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const params = {
        prompt: argv.prompt,
        model: argv.model,
        aspectRatio: argv.aspectRatio,
        numOutputs: argv.numOutputs
      };
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.ref) params.refs = [argv.ref];
      const result = await api.executeTool("text_to_image", params);
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId);
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: "pending",
          message: 'Generation started. Use "melies status <assetId>" to check progress.'
        }, null, 2));
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};
async function pollAsset(api, assetId, maxWait = 12e4) {
  const start = Date.now();
  const interval = 3e3;
  while (Date.now() - start < maxWait) {
    const { assets } = await api.getAssets({ limit: 50 });
    const asset = assets.find((a) => a._id === assetId);
    if (asset) {
      if (asset.status === "completed") {
        return {
          assetId: asset._id,
          status: "completed",
          url: asset.url,
          type: asset.type,
          prompt: asset.prompt,
          model: asset.model
        };
      }
      if (asset.status === "failed") {
        return {
          assetId: asset._id,
          status: "failed",
          error: asset.error || "Generation failed"
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return {
    assetId,
    status: "timeout",
    message: `Generation did not complete within ${maxWait / 1e3}s. Check with "melies status ${assetId}".`
  };
}

// src/commands/video.ts
var videoCommand = {
  command: "video <prompt>",
  describe: "Generate a video from a text prompt (optionally with a reference image)",
  builder: (yargs2) => yargs2.positional("prompt", {
    type: "string",
    description: "Text prompt describing the video",
    demandOption: true
  }).option("model", {
    alias: "m",
    type: "string",
    default: "kling-v2",
    description: 'Video model to use (run "melies models -t video" to see all)'
  }).option("imageUrl", {
    alias: "i",
    type: "string",
    description: "Reference image URL for image-to-video generation"
  }).option("aspectRatio", {
    alias: "a",
    type: "string",
    default: "16:9",
    description: "Aspect ratio (16:9, 9:16, 1:1)"
  }).option("duration", {
    alias: "d",
    type: "number",
    description: "Video duration in seconds (model-dependent)"
  }).option("resolution", {
    alias: "r",
    type: "string",
    description: "Output resolution (model-dependent)"
  }).option("ref", {
    type: "string",
    description: "Reference ID (actor/object) to use for consistent characters"
  }).option("sync", {
    alias: "s",
    type: "boolean",
    default: false,
    description: "Wait for generation to complete and return the URL"
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const params = {
        prompt: argv.prompt,
        model: argv.model,
        aspectRatio: argv.aspectRatio
      };
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.duration) params.duration = argv.duration;
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.ref) params.refs = [argv.ref];
      const result = await api.executeTool("text_to_video", params);
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId, 3e5);
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: "pending",
          message: 'Generation started. Use "melies status <assetId>" to check progress.'
        }, null, 2));
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/poster.ts
var posterCommand = {
  command: "poster <title>",
  describe: "Generate a movie poster from a title, logline, and genre",
  builder: (yargs2) => yargs2.positional("title", {
    type: "string",
    description: "Movie or project title",
    demandOption: true
  }).option("logline", {
    alias: "l",
    type: "string",
    description: "Short synopsis or logline for the poster"
  }).option("genre", {
    alias: "g",
    type: "string",
    description: "Genre (horror, sci-fi, comedy, drama, action, etc.)"
  }).option("model", {
    alias: "m",
    type: "string",
    description: "Image model to use for poster generation"
  }).option("ref", {
    type: "string",
    description: "Reference ID (actor/object) to use for consistent characters"
  }).option("sync", {
    alias: "s",
    type: "boolean",
    default: false,
    description: "Wait for generation to complete and return the URL"
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const params = {
        prompt: `Movie poster for "${argv.title}"${argv.logline ? `. ${argv.logline}` : ""}${argv.genre ? `. Genre: ${argv.genre}` : ""}`,
        model: argv.model || "flux-dev"
      };
      if (argv.ref) params.refs = [argv.ref];
      const result = await api.executeTool("poster_generator", params);
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId);
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: "pending",
          message: 'Poster generation started. Use "melies status <assetId>" to check progress.'
        }, null, 2));
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/status.ts
var statusCommand = {
  command: "status <assetId>",
  describe: "Check the status of a generation job",
  builder: (yargs2) => yargs2.positional("assetId", {
    type: "string",
    description: "Asset ID returned from a generation command",
    demandOption: true
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const { assets } = await api.getAssets({ limit: 100 });
      const asset = assets.find((a) => a._id === argv.assetId);
      if (!asset) {
        console.error(JSON.stringify({ error: `Asset ${argv.assetId} not found in recent assets` }));
        process.exit(1);
      }
      console.log(JSON.stringify({
        assetId: asset._id,
        status: asset.status,
        type: asset.type,
        url: asset.url || null,
        prompt: asset.prompt,
        model: asset.model,
        error: asset.error || null,
        createdAt: asset.createdAt
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/assets.ts
var assetsCommand = {
  command: "assets",
  describe: "List your generated assets (images, videos)",
  builder: (yargs2) => yargs2.option("limit", {
    alias: "l",
    type: "number",
    default: 20,
    description: "Number of assets to return"
  }).option("offset", {
    alias: "o",
    type: "number",
    default: 0,
    description: "Offset for pagination"
  }).option("type", {
    alias: "t",
    type: "string",
    choices: ["text_to_image", "text_to_video", "poster_generator", "image_to_image"],
    description: "Filter by tool type"
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const { assets } = await api.getAssets({
        limit: argv.limit,
        offset: argv.offset,
        toolId: argv.type
      });
      const output = assets.map((a) => ({
        id: a._id,
        name: a.name,
        type: a.type,
        toolId: a.toolId || null,
        status: a.status,
        url: a.url || null,
        model: a.model || null,
        createdAt: a.createdAt
      }));
      console.log(JSON.stringify({ assets: output }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/ref.ts
var refListCommand = {
  command: "list",
  describe: "List your saved references (actors, objects)",
  handler: async () => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const { references } = await api.getReferences();
      const output = references.map((r) => ({
        id: r._id,
        label: r.label,
        type: r.type,
        status: r.status,
        thumbnailUrl: r.thumbnailUrl || null,
        fullUrl: r.fullUrl || null
      }));
      console.log(JSON.stringify(output, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};
var refCreateCommand = {
  command: "create <label>",
  describe: "Create a reference (actor/object) from an image URL",
  builder: (yargs2) => yargs2.positional("label", {
    type: "string",
    description: 'Name for this reference (e.g. "John", "Red Chair")',
    demandOption: true
  }).option("imageUrl", {
    alias: "i",
    type: "string",
    description: "Public image URL of the actor or object",
    demandOption: true
  }).option("type", {
    alias: "t",
    type: "string",
    choices: ["actor", "object"],
    default: "actor",
    description: "Reference type"
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const result = await api.generateReference(
        [argv.imageUrl],
        argv.label,
        argv.type || "actor"
      );
      console.log(JSON.stringify({
        referenceId: result.referenceId,
        status: "generating",
        message: 'Reference is being generated. Use "melies ref list" to check when ready.'
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};
var refDeleteCommand = {
  command: "delete <id>",
  describe: "Delete a reference",
  builder: (yargs2) => yargs2.positional("id", {
    type: "string",
    description: "Reference ID to delete",
    demandOption: true
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      await api.deleteReference(argv.id);
      console.log(JSON.stringify({ success: true, message: "Reference deleted" }));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};
var refCommand = {
  command: "ref",
  describe: "Manage AI actor and object references for consistent characters",
  builder: (yargs2) => yargs2.command(refListCommand).command(refCreateCommand).command(refDeleteCommand).demandCommand(1, 'Run "melies ref --help" to see subcommands'),
  handler: () => {
  }
};

// src/index.ts
(0, import_yargs.default)((0, import_helpers.hideBin)(process.argv)).scriptName("melies").usage("$0 <command> [options]").command(loginCommand).command(creditsCommand).command(modelsCommand).command(imageCommand).command(videoCommand).command(posterCommand).command(statusCommand).command(assetsCommand).command(refCommand).demandCommand(1, 'Run "melies --help" to see available commands').strict().epilogue(
  "AI filmmaking from the command line. Generate movie posters, images, and videos.\n\nGet started: https://melies.co\nDiscover more AI agent skills at https://agentskill.sh"
).parse();
