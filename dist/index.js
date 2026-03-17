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

// src/commands/login.ts
var http = __toESM(require("http"));
var import_child_process = require("child_process");
function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  (0, import_child_process.exec)(`${cmd} "${url}"`);
}
var loginCommand = {
  command: "login",
  describe: "Log in to Melies via browser or with an API token",
  builder: (yargs2) => yargs2.option("token", {
    alias: "t",
    type: "string",
    description: "Provide an API token directly (for CI/agents)"
  }),
  handler: async (argv) => {
    try {
      if (argv.token) {
        saveConfig({ token: argv.token });
        console.log(JSON.stringify({ success: true, message: "Token saved" }));
        return;
      }
      const config = loadConfig();
      const baseUrl = config.apiUrl.replace(/\/api$/, "");
      const server = http.createServer();
      await new Promise((resolve2) => {
        server.listen(0, "127.0.0.1", () => resolve2());
      });
      const address = server.address();
      if (!address || typeof address === "string") {
        console.error(JSON.stringify({ error: "Failed to start local server" }));
        process.exit(1);
      }
      const port = address.port;
      const authUrl = `${baseUrl}/auth/cli?port=${port}`;
      console.error(`Opening browser for authentication...`);
      console.error(`If the browser doesn't open, visit: ${authUrl}`);
      console.error("");
      console.error(`Waiting for authentication...`);
      openBrowser(authUrl);
      const token = await new Promise((resolve2, reject) => {
        const timeout = setTimeout(() => {
          server.close();
          reject(new Error('Authentication timed out after 60 seconds. Use "melies login --token <token>" to paste a token manually.'));
        }, 6e4);
        server.on("request", (req, res) => {
          const url = new URL(req.url || "/", `http://localhost:${port}`);
          if (url.pathname === "/callback") {
            const callbackToken = url.searchParams.get("token");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`
              <html>
                <body style="background:#0a0a0a;color:#a5b4fc;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
                  <div style="text-align:center">
                    <h1 style="font-size:1.5rem;margin-bottom:0.5rem">CLI authenticated</h1>
                    <p style="color:#6b7280">You can close this tab.</p>
                  </div>
                </body>
              </html>
            `);
            clearTimeout(timeout);
            if (callbackToken) {
              resolve2(callbackToken);
            } else {
              reject(new Error("No token received from callback"));
            }
          } else {
            res.writeHead(404);
            res.end();
          }
        });
      });
      server.close();
      saveConfig({ token });
      console.log(JSON.stringify({ success: true, message: "Authenticated successfully" }));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/api.ts
var MeliesAPI = class {
  constructor(token) {
    const config = loadConfig();
    this.apiUrl = config.apiUrl;
    this.token = token || config.token;
  }
  async request(path3, options = {}) {
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
    let url = `${this.apiUrl}${path3}`;
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
  // V2 Tool execution (image, video, poster, upscale, remove-bg)
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
  // Sref style references
  async getSrefStyle(code) {
    try {
      return await this.request(`/sref-styles/${code}`, { method: "GET" });
    } catch {
      return null;
    }
  }
  async searchSrefStyles(keyword) {
    return this.request("/sref-styles/search", {
      method: "GET",
      query: { q: keyword }
    });
  }
  async getTopSrefKeywords() {
    return this.request("/sref-styles/top-keywords", { method: "GET" });
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

// src/utils/model-resolver.ts
var IMAGE_PRESETS = {
  fast: { id: "flux-schnell", credits: 2 },
  quality: { id: "flux-pro", credits: 8 },
  best: { id: "seedream-3", credits: 6 }
};
var VIDEO_PRESETS = {
  fast: { id: "kling-v2", credits: 30 },
  quality: { id: "kling-v3-pro", credits: 100 },
  best: { id: "veo-3.1", credits: 400 }
};
var PRESETS = {
  image: IMAGE_PRESETS,
  video: VIDEO_PRESETS
};
function resolveModel(type, options) {
  if (options.model) return options.model;
  if (options.best) return PRESETS[type].best.id;
  if (options.quality) return PRESETS[type].quality.id;
  return PRESETS[type].fast.id;
}
function getPresetCredits(type, options) {
  if (options.model) return null;
  if (options.best) return PRESETS[type].best.credits;
  if (options.quality) return PRESETS[type].quality.credits;
  return PRESETS[type].fast.credits;
}

// src/data/actors.json
var actors_default = [
  {
    name: "Aria",
    id: "aria",
    modifier: "young East Asian woman, dark straight hair, natural minimal makeup, single eyelid, gentle warm expression",
    r2Url: "https://asset.melies.co/actors/aria-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Asian",
      "Influencer",
      "Natural"
    ]
  },
  {
    name: "Zara",
    id: "zara",
    modifier: "elegant Black woman in her 30s, natural afro hair, warm brown skin, high cheekbones, confident refined expression",
    r2Url: "https://asset.melies.co/actors/zara-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Female",
      "30s",
      "African",
      "Actor",
      "Elegant"
    ]
  },
  {
    name: "Leo",
    id: "leo",
    modifier: "white man in his early 30s, short brown hair, light stubble, rugged features, approachable expression, strong jawline",
    r2Url: "https://asset.melies.co/actors/leo-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "European",
      "Everyday",
      "Rugged"
    ]
  },
  {
    name: "Mei",
    id: "mei",
    modifier: "young Southeast Asian woman, long wavy dark hair, expressive eyes, youthful radiant face, warm gentle smile",
    r2Url: "https://asset.melies.co/actors/mei-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "Asian",
      "Everyday",
      "Youthful"
    ]
  },
  {
    name: "James",
    id: "james",
    modifier: "distinguished Black man in his 50s, salt-and-pepper beard, authoritative wise expression, strong facial features, silver temples",
    r2Url: "https://asset.melies.co/actors/james-full.webp",
    gender: "Male",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Male",
      "50s",
      "African",
      "Actor",
      "Distinguished"
    ]
  },
  {
    name: "Sofia",
    id: "sofia",
    modifier: "Mediterranean woman in her 40s, olive skin, dark curly hair, expressive eyes, charismatic passionate expression",
    r2Url: "https://asset.melies.co/actors/sofia-full.webp",
    gender: "Female",
    ageGroup: "40s",
    type: "Actor",
    tags: [
      "Female",
      "40s",
      "Mediterranean",
      "Actor",
      "Charismatic"
    ]
  },
  {
    name: "Kai",
    id: "kai",
    modifier: "androgynous person with mixed heritage, short textured hair, sharp angular features, modern streetwear style, cool direct gaze",
    r2Url: "https://asset.melies.co/actors/kai-full.webp",
    gender: "Non-binary",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Non-binary",
      "20s",
      "Mixed",
      "Influencer",
      "Streetwear"
    ]
  },
  {
    name: "Riku",
    id: "riku",
    modifier: "young Japanese man in his early 20s, clean-cut black hair, gentle thoughtful expression, smooth skin, subtle sophistication",
    r2Url: "https://asset.melies.co/actors/riku-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "Asian",
      "Everyday",
      "Clean-cut"
    ]
  },
  {
    name: "Amara",
    id: "amara",
    modifier: "young West African woman, high cheekbones, radiant dark skin, vibrant expressive eyes, natural hair",
    r2Url: "https://asset.melies.co/actors/amara-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "African",
      "Influencer",
      "Vibrant"
    ]
  },
  {
    name: "Viktor",
    id: "viktor",
    modifier: "Eastern European man in his 40s, strong jawline, piercing light grey eyes, grey temples, stoic commanding presence",
    r2Url: "https://asset.melies.co/actors/viktor-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Actor",
    tags: [
      "Male",
      "40s",
      "European",
      "Actor",
      "Stoic"
    ]
  },
  {
    name: "Luna",
    id: "luna",
    modifier: "Latina woman in her 30s, wavy dark hair, warm olive skin, bright smile, vivacious expressive face",
    r2Url: "https://asset.melies.co/actors/luna-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Female",
      "30s",
      "Latin",
      "Actor",
      "Vivacious"
    ]
  },
  {
    name: "Chen",
    id: "chen",
    modifier: "Chinese man in his 50s, silver-streaked black hair, intellectual calm demeanor, authoritative expression, distinguished features",
    r2Url: "https://asset.melies.co/actors/chen-full.webp",
    gender: "Male",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Male",
      "50s",
      "Asian",
      "Actor",
      "Intellectual"
    ]
  },
  {
    name: "Yuki",
    id: "yuki",
    modifier: "young Japanese woman with gap between front teeth, straight dark blunt bangs, single eyelid, round face, pale skin with flush",
    r2Url: "https://asset.melies.co/actors/yuki-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Asian",
      "Influencer",
      "Gap teeth"
    ]
  },
  {
    name: "Elena",
    id: "elena",
    modifier: "Ukrainian woman, pale porcelain skin, high cheekbones, ice-blue eyes, straight blonde hair, intense quiet expression",
    r2Url: "https://asset.melies.co/actors/elena-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "European",
      "Everyday",
      "Blue eyes"
    ]
  },
  {
    name: "Priya",
    id: "priya",
    modifier: "Indian woman, warm medium-brown skin, large almond eyes, long dark wavy hair, small gold nose ring, full lips",
    r2Url: "https://asset.melies.co/actors/priya-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "South Asian",
      "Influencer",
      "Nose ring"
    ]
  },
  {
    name: "Fatimah",
    id: "fatimah",
    modifier: "Somali woman, very deep blue-black skin, angular sharp face, high forehead, natural tight coils, slender neck, quiet intensity",
    r2Url: "https://asset.melies.co/actors/fatimah-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "African",
      "Everyday",
      "Dark skin"
    ]
  },
  {
    name: "Ingrid",
    id: "ingrid",
    modifier: "Swedish woman, 55, silver pixie cut, pale skin with fine lines, strong jaw, pale grey eyes, powerful presence",
    r2Url: "https://asset.melies.co/actors/ingrid-full.webp",
    gender: "Female",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Female",
      "50s",
      "European",
      "Actor",
      "Silver hair"
    ]
  },
  {
    name: "Yara",
    id: "yara",
    modifier: "Brazilian mixed-race woman, medium-warm skin, thick curly dark hair, full lips, wide nose, athletic build",
    r2Url: "https://asset.melies.co/actors/yara-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Female",
      "30s",
      "Latin",
      "Actor",
      "Curly hair"
    ]
  },
  {
    name: "Claire",
    id: "claire",
    modifier: "French woman, pale freckled skin, wavy auburn hair, natural brows, slight tiredness around eyes, intellectual warmth",
    r2Url: "https://asset.melies.co/actors/claire-full.webp",
    gender: "Female",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Female",
      "40s",
      "European",
      "Everyday",
      "Freckles"
    ]
  },
  {
    name: "Marta",
    id: "marta",
    modifier: "Polish woman, light skin, dirty blonde hair, deep-set brown eyes, slight under-eye circles, genuine warm expression",
    r2Url: "https://asset.melies.co/actors/marta-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "European",
      "Everyday",
      "Authentic"
    ]
  },
  {
    name: "Amira",
    id: "amira",
    modifier: "Moroccan woman in her 50s, deep olive skin, silver-streaked hair in bun, crow's feet, strong matriarchal dignified presence",
    r2Url: "https://asset.melies.co/actors/amira-full.webp",
    gender: "Female",
    ageGroup: "50s",
    type: "Everyday",
    tags: [
      "Female",
      "50s",
      "Middle Eastern",
      "Everyday",
      "Silver hair"
    ]
  },
  {
    name: "Adaeze",
    id: "adaeze",
    modifier: "young Igbo-Nigerian woman, very dark skin, long thin box braids, high cheekbones, wide bright eyes, Gen Z energy",
    r2Url: "https://asset.melies.co/actors/adaeze-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "African",
      "Influencer",
      "Braids"
    ]
  },
  {
    name: "Hana",
    id: "hana",
    modifier: "Korean woman, single eyelid, pale skin, delicate fine features, long straight dark hair, minimal makeup, soft expression",
    r2Url: "https://asset.melies.co/actors/hana-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Asian",
      "Influencer",
      "Minimal"
    ]
  },
  {
    name: "Vera",
    id: "vera",
    modifier: "Serbian woman, 59, white hair pulled back, strong Slavic features, pale sun-spotted skin, deep crow's feet, dignified",
    r2Url: "https://asset.melies.co/actors/vera-full.webp",
    gender: "Female",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Female",
      "50s",
      "European",
      "Actor",
      "White hair"
    ]
  },
  {
    name: "Meiying",
    id: "meiying",
    modifier: "Taiwanese woman, straight black hair, thin gold reading glasses, medium-light skin, professional capable expression",
    r2Url: "https://asset.melies.co/actors/meiying-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "Asian",
      "Everyday",
      "Glasses"
    ]
  },
  {
    name: "Cleo",
    id: "cleo",
    modifier: "Caribbean woman, medium warm brown skin, wild natural curls full volume, small gold hoops, bright confident expression",
    r2Url: "https://asset.melies.co/actors/cleo-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Influencer",
    tags: [
      "Female",
      "30s",
      "African",
      "Influencer",
      "Natural hair"
    ]
  },
  {
    name: "Roshni",
    id: "roshni",
    modifier: "Indian woman, dusky medium-brown skin, thick defined brows, straight dark hair, small nose stud, natural authentic look",
    r2Url: "https://asset.melies.co/actors/roshni-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "South Asian",
      "Everyday",
      "Nose stud"
    ]
  },
  {
    name: "Agnes",
    id: "agnes",
    modifier: "elderly Swedish woman, layered silver bob, sun-spotted skin, sharp blue eyes, deep smile lines, energetic vital presence",
    r2Url: "https://asset.melies.co/actors/agnes-full.webp",
    gender: "Female",
    ageGroup: "60s",
    type: "Actor",
    tags: [
      "Female",
      "60s",
      "European",
      "Actor",
      "Silver hair"
    ]
  },
  {
    name: "Irem",
    id: "irem",
    modifier: "Turkish woman, warm olive skin, strong arched brows, long straight dark hair, modern direct confident expression",
    r2Url: "https://asset.melies.co/actors/irem-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "Middle Eastern",
      "Everyday",
      "Strong brows"
    ]
  },
  {
    name: "Mai",
    id: "mai",
    modifier: "Vietnamese woman, slim oval face, straight black hair, very minimal makeup, quiet composed reserved expression",
    r2Url: "https://asset.melies.co/actors/mai-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "Asian",
      "Everyday",
      "Quiet"
    ]
  },
  {
    name: "Lucia",
    id: "lucia",
    modifier: "Argentine woman, light Mediterranean tan, long straight dark hair, fine forehead lines, high cheekbones, elegant presence",
    r2Url: "https://asset.melies.co/actors/lucia-full.webp",
    gender: "Female",
    ageGroup: "40s",
    type: "Actor",
    tags: [
      "Female",
      "40s",
      "Latin",
      "Actor",
      "Elegant"
    ]
  },
  {
    name: "Adesuwa",
    id: "adesuwa",
    modifier: "elderly Nigerian woman, very deep dark skin, long grey sisterlocks, strong matriarch face, commanding dignified presence",
    r2Url: "https://asset.melies.co/actors/adesuwa-full.webp",
    gender: "Female",
    ageGroup: "60s",
    type: "Actor",
    tags: [
      "Female",
      "60s",
      "African",
      "Actor",
      "Locs"
    ]
  },
  {
    name: "Chiamaka",
    id: "chiamaka",
    modifier: "Nigerian woman, dark brown skin, cornrows going back, subtle artistic liner, direct gaze, creative confident energy",
    r2Url: "https://asset.melies.co/actors/chiamaka-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Influencer",
    tags: [
      "Female",
      "30s",
      "African",
      "Influencer",
      "Braids"
    ]
  },
  {
    name: "Yolanda",
    id: "yolanda",
    modifier: "Brazilian woman in her late 50s, rich warm brown skin, curly salt-and-pepper hair, bright genuine smile, warm crow's feet",
    r2Url: "https://asset.melies.co/actors/yolanda-full.webp",
    gender: "Female",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Female",
      "50s",
      "Latin",
      "Actor",
      "Natural hair"
    ]
  },
  {
    name: "Astrid",
    id: "astrid",
    modifier: "Icelandic woman, 19, extremely pale skin, near-white eyebrows and lashes, pale grey-blue eyes, delicate elfin features",
    r2Url: "https://asset.melies.co/actors/astrid-full.webp",
    gender: "Female",
    ageGroup: "Teens",
    type: "Everyday",
    tags: [
      "Female",
      "Teens",
      "European",
      "Everyday",
      "Pale"
    ]
  },
  {
    name: "Pilar",
    id: "pilar",
    modifier: "Colombian woman, tanned olive skin, dark curly hair with grey strands, laugh lines, warm grounded community-leader presence",
    r2Url: "https://asset.melies.co/actors/pilar-full.webp",
    gender: "Female",
    ageGroup: "50s",
    type: "Everyday",
    tags: [
      "Female",
      "50s",
      "Latin",
      "Everyday",
      "Natural"
    ]
  },
  {
    name: "Soyeon",
    id: "soyeon",
    modifier: "Korean woman, round soft face, double eyelid, pale skin with flush, small gap between front teeth, shy genuine smile",
    r2Url: "https://asset.melies.co/actors/soyeon-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "Asian",
      "Everyday",
      "Gap teeth"
    ]
  },
  {
    name: "Adela",
    id: "adela",
    modifier: "Mexican-Indigenous woman, warm dark brown skin, broad indigenous features, silver-streaked dark braid, deep unhurried dignity",
    r2Url: "https://asset.melies.co/actors/adela-full.webp",
    gender: "Female",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Female",
      "40s",
      "Latin",
      "Everyday",
      "Indigenous"
    ]
  },
  {
    name: "Deepa",
    id: "deepa",
    modifier: "Tamil Indian woman, dark rich brown skin, long straight black hair, professional composed bearing, small diamond nose stud",
    r2Url: "https://asset.melies.co/actors/deepa-full.webp",
    gender: "Female",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Female",
      "40s",
      "South Asian",
      "Everyday",
      "Professional"
    ]
  },
  {
    name: "Gabriella",
    id: "gabriella",
    modifier: "Italian woman, olive skin, expressive dark eyes, eye crinkle lines, dark wavy hair natural volume, warm charismatic",
    r2Url: "https://asset.melies.co/actors/gabriella-full.webp",
    gender: "Female",
    ageGroup: "40s",
    type: "Actor",
    tags: [
      "Female",
      "40s",
      "European",
      "Actor",
      "Expressive"
    ]
  },
  {
    name: "Camille",
    id: "camille",
    modifier: "French woman, very pale skin, soft brown eyes, small upturned nose, brunette in loose bun, natural Parisian nonchalance",
    r2Url: "https://asset.melies.co/actors/camille-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Female",
      "30s",
      "European",
      "Actor",
      "Parisian"
    ]
  },
  {
    name: "Nour",
    id: "nour",
    modifier: "Lebanese woman, olive skin, thick unplucked brows, dark curly hair, expressive open face, zero makeup, completely authentic",
    r2Url: "https://asset.melies.co/actors/nour-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "Middle Eastern",
      "Everyday",
      "Natural"
    ]
  },
  {
    name: "Layla",
    id: "layla",
    modifier: "Palestinian woman, medium olive skin, long straight dark hair, dark almond eyes with natural kohl, calm steady expression",
    r2Url: "https://asset.melies.co/actors/layla-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "Middle Eastern",
      "Everyday",
      "Dark eyes"
    ]
  },
  {
    name: "Zainab",
    id: "zainab",
    modifier: "Nigerian woman, deep dark skin, braided updo with gold cuff, full round face, kind eyes, warm generous presence",
    r2Url: "https://asset.melies.co/actors/zainab-full.webp",
    gender: "Female",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Female",
      "40s",
      "African",
      "Everyday",
      "Braids"
    ]
  },
  {
    name: "Keiko",
    id: "keiko",
    modifier: "elderly Japanese woman, silver-streaked black hair in bun, deep smile lines, graceful aged face, refined elegant presence",
    r2Url: "https://asset.melies.co/actors/keiko-full.webp",
    gender: "Female",
    ageGroup: "60s",
    type: "Actor",
    tags: [
      "Female",
      "60s",
      "Asian",
      "Actor",
      "Elegant"
    ]
  },
  {
    name: "Salma",
    id: "salma",
    modifier: "Egyptian woman, medium olive-tan skin, naturally heavy dark brows, dark eyes, long straight dark hair, zero makeup, direct",
    r2Url: "https://asset.melies.co/actors/salma-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "Middle Eastern",
      "Everyday",
      "Strong brows"
    ]
  },
  {
    name: "Paloma",
    id: "paloma",
    modifier: "Spanish woman, olive skin, dark wavy hair, small gold earring, relaxed authentic effortless expression",
    r2Url: "https://asset.melies.co/actors/paloma-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "European",
      "Everyday",
      "Bohemian"
    ]
  },
  {
    name: "Marcus",
    id: "marcus",
    modifier: "Black American man, medium-dark skin, clean fade, strong wide neck, full lips, direct honest gaze",
    r2Url: "https://asset.melies.co/actors/marcus-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "African",
      "Everyday",
      "Fade"
    ]
  },
  {
    name: "Tomas",
    id: "tomas",
    modifier: "Mexican man, dark olive-brown skin, salt-and-pepper thick mustache, strong jaw, deep-set dark eyes, weathered sun-worked face",
    r2Url: "https://asset.melies.co/actors/tomas-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "Latin",
      "Everyday",
      "Mustache"
    ]
  },
  {
    name: "Finn",
    id: "finn",
    modifier: "Irish man, very pale freckled skin all over face, short wavy auburn hair, sunburned nose, wide genuine smile, green eyes",
    r2Url: "https://asset.melies.co/actors/finn-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "European",
      "Everyday",
      "Freckles"
    ]
  },
  {
    name: "Kofi",
    id: "kofi",
    modifier: "Ghanaian man, very dark rich skin, close-cut natural fade, wide flat nose, warm bright open smile, strong neck",
    r2Url: "https://asset.melies.co/actors/kofi-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "African",
      "Everyday",
      "Warm smile"
    ]
  },
  {
    name: "Carlos",
    id: "carlos",
    modifier: "Argentine man, tanned skin, wavy dark hair greying at temples, prominent aquiline nose, thoughtful intelligent expression",
    r2Url: "https://asset.melies.co/actors/carlos-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "Latin",
      "Everyday",
      "Greying"
    ]
  },
  {
    name: "Bjorn",
    id: "bjorn",
    modifier: "Norwegian man in his 60s, pale weathered skin, full white beard, deep furrow lines, piercing pale blue eyes, stoic outdoorsman",
    r2Url: "https://asset.melies.co/actors/bjorn-full.webp",
    gender: "Male",
    ageGroup: "60s",
    type: "Everyday",
    tags: [
      "Male",
      "60s",
      "European",
      "Everyday",
      "White beard"
    ]
  },
  {
    name: "Sanjay",
    id: "sanjay",
    modifier: "Indian man, medium-dark brown skin, salt-and-pepper hair, heavy brow ridge, dark under-eye circles, thin wire glasses",
    r2Url: "https://asset.melies.co/actors/sanjay-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "South Asian",
      "Everyday",
      "Glasses"
    ]
  },
  {
    name: "Derek",
    id: "derek",
    modifier: "Black American man in his late 50s, greying natural hair, deep laugh lines, warm authoritative expression, silver temples",
    r2Url: "https://asset.melies.co/actors/derek-full.webp",
    gender: "Male",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Male",
      "50s",
      "African",
      "Actor",
      "Distinguished"
    ]
  },
  {
    name: "Andrei",
    id: "andrei",
    modifier: "Romanian man, medium olive skin, very defined sharp cheekbones, dark deep-set eyes, short dark hair, angular intense face",
    r2Url: "https://asset.melies.co/actors/andrei-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Male",
      "30s",
      "European",
      "Actor",
      "Cheekbones"
    ]
  },
  {
    name: "Ibrahim",
    id: "ibrahim",
    modifier: "Sudanese man, very deep blue-black skin, angular sharp high-cheekbone face, close-cut natural hair, quiet contemplative intensity",
    r2Url: "https://asset.melies.co/actors/ibrahim-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "African",
      "Everyday",
      "Dark skin"
    ]
  },
  {
    name: "Kwame",
    id: "kwame",
    modifier: "young Ghanaian man, very dark skin, early short locs, wide smile with gap teeth, Gen Z confidence",
    r2Url: "https://asset.melies.co/actors/kwame-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Male",
      "20s",
      "African",
      "Influencer",
      "Gap teeth"
    ]
  },
  {
    name: "Oliver",
    id: "oliver",
    modifier: "British man, pale skin, disheveled brown hair, distinctive slight underbite, natural unpolished real face",
    r2Url: "https://asset.melies.co/actors/oliver-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "European",
      "Everyday",
      "Authentic"
    ]
  },
  {
    name: "Paulo",
    id: "paulo",
    modifier: "Brazilian man, medium warm tanned skin, wavy dark hair pushed back, casual unposed confidence",
    r2Url: "https://asset.melies.co/actors/paulo-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "Latin",
      "Everyday",
      "Casual"
    ]
  },
  {
    name: "Jerome",
    id: "jerome",
    modifier: "French-Congolese man, medium warm brown skin, shaved sides natural textured top, sharp jawline, expressive eyes, arresting presence",
    r2Url: "https://asset.melies.co/actors/jerome-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Male",
      "30s",
      "African",
      "Actor",
      "Cheekbones"
    ]
  },
  {
    name: "Rob",
    id: "rob",
    modifier: "Australian man, sun-damaged pale freckled skin, salt-and-pepper stubble, outdoor squint lines, rugged lived-in face",
    r2Url: "https://asset.melies.co/actors/rob-full.webp",
    gender: "Male",
    ageGroup: "50s",
    type: "Everyday",
    tags: [
      "Male",
      "50s",
      "European",
      "Everyday",
      "Weathered"
    ]
  },
  {
    name: "Dayo",
    id: "dayo",
    modifier: "Nigerian man, very dark skin, bright white teeth, strong muscular neck, clean tight fade, natural influencer confidence",
    r2Url: "https://asset.melies.co/actors/dayo-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Male",
      "20s",
      "African",
      "Influencer",
      "Fade"
    ]
  },
  {
    name: "Alejandro",
    id: "alejandro",
    modifier: "Colombian man, tanned skin, strong jaw with heavy stubble, slightly crooked nose, dark hair pushed back",
    r2Url: "https://asset.melies.co/actors/alejandro-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "Latin",
      "Everyday",
      "Stubble"
    ]
  },
  {
    name: "Tobias",
    id: "tobias",
    modifier: "German man, light skin, dirty blond hair, angular face with mild acne scarring on cheeks, pale blue eyes, real unretouched skin",
    r2Url: "https://asset.melies.co/actors/tobias-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "European",
      "Everyday",
      "Acne scars"
    ]
  },
  {
    name: "Hiro",
    id: "hiro",
    modifier: "Japanese man, thin narrow face, slightly receding hairline, neat dark hair, thin wire-rimmed rectangular glasses, intellectual calm",
    r2Url: "https://asset.melies.co/actors/hiro-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "Asian",
      "Everyday",
      "Glasses"
    ]
  },
  {
    name: "Felix",
    id: "felix",
    modifier: "Swiss man in his 40s, salt-and-pepper neat hair, slight jowl forming, light eyes, clean-shaven, conservative composed",
    r2Url: "https://asset.melies.co/actors/felix-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "European",
      "Everyday",
      "Professional"
    ]
  },
  {
    name: "Miguel",
    id: "miguel",
    modifier: "Puerto-Rican man, warm medium-brown skin, full dark beard, small neck tattoo just visible, compelling magnetic gaze",
    r2Url: "https://asset.melies.co/actors/miguel-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Male",
      "30s",
      "Latin",
      "Actor",
      "Beard"
    ]
  },
  {
    name: "Pierre",
    id: "pierre",
    modifier: "Senegalese-French man, medium dark skin, very defined prominent cheekbones, clean fade, arresting fashion-forward presence",
    r2Url: "https://asset.melies.co/actors/pierre-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Male",
      "30s",
      "African",
      "Actor",
      "Cheekbones"
    ]
  },
  {
    name: "Yusuf",
    id: "yusuf",
    modifier: "Somali man, extremely slender angular long face, very dark skin, natural short afro, quiet deeply contemplative expression",
    r2Url: "https://asset.melies.co/actors/yusuf-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "African",
      "Everyday",
      "Slender"
    ]
  },
  {
    name: "Dante",
    id: "dante",
    modifier: "Dominican man, caramel light-brown skin, natural curly medium hair, wide flat nose, easy relaxed smile, laid-back",
    r2Url: "https://asset.melies.co/actors/dante-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "Latin",
      "Everyday",
      "Curly hair"
    ]
  },
  {
    name: "Samuel",
    id: "samuel",
    modifier: "Ethiopian man, lean angular face, medium-dark skin, high forehead, close-cropped natural hair greying at temples, serious",
    r2Url: "https://asset.melies.co/actors/samuel-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "African",
      "Everyday",
      "Greying"
    ]
  },
  {
    name: "Lars",
    id: "lars",
    modifier: "Danish man, very pale skin, straight reddish-brown hair pushed to side, scattered freckles, open friendly casual expression",
    r2Url: "https://asset.melies.co/actors/lars-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "European",
      "Everyday",
      "Freckles"
    ]
  },
  {
    name: "Winston",
    id: "winston",
    modifier: "Zimbabwean man, dark medium-brown skin, slightly receding hairline, short greying hair, professional serious furrowed expression",
    r2Url: "https://asset.melies.co/actors/winston-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "African",
      "Everyday",
      "Professional"
    ]
  },
  {
    name: "Tariq",
    id: "tariq",
    modifier: "Saudi man, warm medium tan skin, precisely trimmed beard, strong square jaw, dark eyes, modern urban professional",
    r2Url: "https://asset.melies.co/actors/tariq-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "Middle Eastern",
      "Everyday",
      "Beard"
    ]
  },
  {
    name: "Kwabena",
    id: "kwabena",
    modifier: "Ghanaian elder man, very deep dark skin, completely white natural hair and full beard, wise face with deep lines, immense dignity",
    r2Url: "https://asset.melies.co/actors/kwabena-full.webp",
    gender: "Male",
    ageGroup: "60s",
    type: "Actor",
    tags: [
      "Male",
      "60s",
      "African",
      "Actor",
      "White hair"
    ]
  },
  {
    name: "Matteo",
    id: "matteo",
    modifier: "Italian man, tanned Mediterranean skin, wavy dark hair natural volume, slight stubble, genuine open warmth",
    r2Url: "https://asset.melies.co/actors/matteo-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "European",
      "Everyday",
      "Mediterranean"
    ]
  },
  {
    name: "Ben",
    id: "ben",
    modifier: "Israeli man, medium olive skin, dark curly untamed hair, direct honest gaze, slight stubble, casual tech aesthetic",
    r2Url: "https://asset.melies.co/actors/ben-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "Middle Eastern",
      "Everyday",
      "Curly hair"
    ]
  },
  {
    name: "Kolade",
    id: "kolade",
    modifier: "Nigerian man, medium-dark brown skin, full wide face, professional fade haircut, wide jaw, composed confident",
    r2Url: "https://asset.melies.co/actors/kolade-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "African",
      "Everyday",
      "Professional"
    ]
  },
  {
    name: "Rafael",
    id: "rafael",
    modifier: "Cuban man in his 50s, salt-and-pepper thick wavy hair, expressive warm brown eyes, lived-in face with character lines",
    r2Url: "https://asset.melies.co/actors/rafael-full.webp",
    gender: "Male",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Male",
      "50s",
      "Latin",
      "Actor",
      "Character face"
    ]
  },
  {
    name: "Henrik",
    id: "henrik",
    modifier: "Norwegian man, blond going grey, blue eyes, outdoor rugged face with wind and sun damage, short beard",
    r2Url: "https://asset.melies.co/actors/henrik-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "European",
      "Everyday",
      "Outdoorsy"
    ]
  },
  {
    name: "Babatunde",
    id: "babatunde",
    modifier: "Yoruba-Nigerian man, very deep dark skin, completely grey natural hair, strong forehead, powerful dignified wise presence",
    r2Url: "https://asset.melies.co/actors/babatunde-full.webp",
    gender: "Male",
    ageGroup: "50s",
    type: "Actor",
    tags: [
      "Male",
      "50s",
      "African",
      "Actor",
      "Silver hair"
    ]
  },
  {
    name: "Ezra",
    id: "ezra",
    modifier: "young American-Jewish man, dark unruly curly hair, thin wire circular glasses, soft thoughtful face, intellectual creative",
    r2Url: "https://asset.melies.co/actors/ezra-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "European",
      "Everyday",
      "Glasses"
    ]
  },
  {
    name: "Peter",
    id: "peter",
    modifier: "Czech man, pale skin, shaved head bald, strong square face, slightly heavy jaw and neck, direct no-nonsense expression",
    r2Url: "https://asset.melies.co/actors/peter-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "European",
      "Everyday",
      "Bald"
    ]
  },
  {
    name: "Terrence",
    id: "terrence",
    modifier: "Black American man, medium dark skin, shaved head with silver stubble, strong defined face, silver beard, commanding",
    r2Url: "https://asset.melies.co/actors/terrence-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Actor",
    tags: [
      "Male",
      "40s",
      "African",
      "Actor",
      "Shaved head"
    ]
  },
  {
    name: "Nikolai",
    id: "nikolai",
    modifier: "Russian man, pale skin, strong square jaw, dark hair slight grey, permanent brow furrow, powerful cold intense presence",
    r2Url: "https://asset.melies.co/actors/nikolai-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Actor",
    tags: [
      "Male",
      "40s",
      "European",
      "Actor",
      "Intense"
    ]
  },
  {
    name: "Jamie",
    id: "jamie",
    modifier: "British man, light skin, brown hair with widow's peak, wire-rimmed glasses, genuine warm dad energy, approachable",
    r2Url: "https://asset.melies.co/actors/jamie-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "European",
      "Everyday",
      "Glasses"
    ]
  },
  {
    name: "Taylor",
    id: "taylor",
    modifier: "androgynous non-binary person, mixed heritage, platinum short hair, sharp features, direct confident creative expression",
    r2Url: "https://asset.melies.co/actors/taylor-full.webp",
    gender: "Non-binary",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Non-binary",
      "20s",
      "Mixed",
      "Influencer",
      "Platinum hair"
    ]
  },
  {
    name: "River",
    id: "river",
    modifier: "androgynous non-binary person, pale skin, long loose brown hair, soft rounded features, calm introspective expression",
    r2Url: "https://asset.melies.co/actors/river-full.webp",
    gender: "Non-binary",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Non-binary",
      "30s",
      "European",
      "Everyday",
      "Long hair"
    ]
  },
  {
    name: "Alex",
    id: "alex",
    modifier: "androgynous non-binary person, SE Asian heritage, medium light skin, short textured black hair, composed quiet neutral",
    r2Url: "https://asset.melies.co/actors/alex-full.webp",
    gender: "Non-binary",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Non-binary",
      "20s",
      "Asian",
      "Everyday",
      "Minimal"
    ]
  },
  {
    name: "Sam",
    id: "sam",
    modifier: "androgynous non-binary person, medium-dark skin, natural twisted hair, expressive wide eyes, alternative creative bold",
    r2Url: "https://asset.melies.co/actors/sam-full.webp",
    gender: "Non-binary",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Non-binary",
      "20s",
      "African",
      "Influencer",
      "Natural hair"
    ]
  },
  {
    name: "Morgan",
    id: "morgan",
    modifier: "androgynous non-binary person, pale freckled skin, short auburn hair, angular features, direct confident strong presence",
    r2Url: "https://asset.melies.co/actors/morgan-full.webp",
    gender: "Non-binary",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Non-binary",
      "30s",
      "European",
      "Actor",
      "Freckles"
    ]
  },
  {
    name: "Kendall",
    id: "kendall",
    modifier: "androgynous non-binary person, light caramel skin, curly natural hair loose, warm open face, natural effortless style",
    r2Url: "https://asset.melies.co/actors/kendall-full.webp",
    gender: "Non-binary",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Non-binary",
      "20s",
      "Mixed",
      "Influencer",
      "Curly hair"
    ]
  },
  {
    name: "Reese",
    id: "reese",
    modifier: "androgynous non-binary person, pale skin, dark straight blunt-cut hair, round soft face, rectangular glasses, quiet gentle",
    r2Url: "https://asset.melies.co/actors/reese-full.webp",
    gender: "Non-binary",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Non-binary",
      "20s",
      "Asian",
      "Everyday",
      "Glasses"
    ]
  },
  {
    name: "Quinn",
    id: "quinn",
    modifier: "androgynous non-binary person, medium brown skin, shaved sides natural textured top, strong cheekbones, intense direct gaze",
    r2Url: "https://asset.melies.co/actors/quinn-full.webp",
    gender: "Non-binary",
    ageGroup: "30s",
    type: "Actor",
    tags: [
      "Non-binary",
      "30s",
      "Mixed",
      "Actor",
      "Cheekbones"
    ]
  },
  {
    name: "Blake",
    id: "blake",
    modifier: "androgynous non-binary person, pale skin, wavy blonde hair, soft jaw, light grey-blue eyes, genuinely gender-neutral",
    r2Url: "https://asset.melies.co/actors/blake-full.webp",
    gender: "Non-binary",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Non-binary",
      "20s",
      "European",
      "Everyday",
      "Blonde"
    ]
  },
  {
    name: "Drew",
    id: "drew",
    modifier: "androgynous non-binary person, medium-dark skin, very short natural hair, strong angular features, composed direct grounded",
    r2Url: "https://asset.melies.co/actors/drew-full.webp",
    gender: "Non-binary",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Non-binary",
      "40s",
      "African",
      "Everyday",
      "Natural"
    ]
  },
  {
    name: "Ingenue",
    id: "ingenue",
    modifier: "very pale porcelain-skinned French woman 20, jet-black dyed blunt bob, dark brown eyes, dark red lipstick, artsy alternative style, subtle dark eyeliner, moody striking",
    r2Url: "https://asset.melies.co/actors/ingenue-full.webp",
    gender: "Female",
    ageGroup: "Teens",
    type: "Actor",
    tags: [
      "Female",
      "Teens",
      "European",
      "Actor",
      "Alternative"
    ]
  },
  {
    name: "Ming",
    id: "ming",
    modifier: "young Chinese woman, baby-round face, monolid, light skin, dark straight hair with pink-dyed tips, Gen Z effortless shy",
    r2Url: "https://asset.melies.co/actors/ming-full.webp",
    gender: "Female",
    ageGroup: "Teens",
    type: "Everyday",
    tags: [
      "Female",
      "Teens",
      "Asian",
      "Everyday",
      "Dyed hair"
    ]
  },
  {
    name: "Rodrigo",
    id: "rodrigo",
    modifier: "young Brazilian man, warm medium tanned skin, dark wavy hair pushed back, slight stubble, relaxed surfer-adjacent unpretentious",
    r2Url: "https://asset.melies.co/actors/rodrigo-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "Latin",
      "Everyday",
      "Casual"
    ]
  },
  {
    name: "Jake",
    id: "jake",
    modifier: "white American teen boy 17, casual skater style, messy medium brown hair, clear skin slight freckles, relaxed confident expression",
    r2Url: "https://asset.melies.co/actors/jake-full.webp",
    gender: "Male",
    ageGroup: "Teens",
    type: "Everyday",
    tags: [
      "Male",
      "Teens",
      "White",
      "Everyday",
      "Sporty",
      "Street"
    ]
  },
  {
    name: "Ethan",
    id: "ethan",
    modifier: "half Japanese half white teen boy 16, indie look, dark wavy hair, dark-rimmed glasses, thoughtful intelligent expression, quiet charm",
    r2Url: "https://asset.melies.co/actors/ethan-full.webp",
    gender: "Male",
    ageGroup: "Teens",
    type: "Everyday",
    tags: [
      "Male",
      "Teens",
      "Asian",
      "Everyday",
      "Cute"
    ]
  },
  {
    name: "Noah",
    id: "noah-t",
    modifier: "young Black American teen boy 18, athletic look, close-cropped natural hair, strong jaw, bright confident expression",
    r2Url: "https://asset.melies.co/actors/noah-t-full.webp",
    gender: "Male",
    ageGroup: "Teens",
    type: "Everyday",
    tags: [
      "Male",
      "Teens",
      "Black",
      "Everyday",
      "Sporty"
    ]
  },
  {
    name: "Bella",
    id: "bella",
    modifier: "young Latina woman 23, beautiful influencer look, long wavy dark hair with caramel highlights, full lips, expressive dark eyes, effortlessly glamorous",
    r2Url: "https://asset.melies.co/actors/bella-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Latina",
      "Influencer",
      "Cute",
      "Glam"
    ]
  },
  {
    name: "Chloe",
    id: "chloe",
    modifier: "Korean-American woman 24, stunning influencer, straight black hair curtain bangs, large bright eyes, clear porcelain skin, cute button nose",
    r2Url: "https://asset.melies.co/actors/chloe-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Korean",
      "Influencer",
      "Cute"
    ]
  },
  {
    name: "Kenzo",
    id: "kenzo",
    modifier: "Korean man 22, K-pop influenced style, perfectly styled dark hair swept to side, soft handsome features, flawless clear skin, bright expressive eyes",
    r2Url: "https://asset.melies.co/actors/kenzo-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Male",
      "20s",
      "Korean",
      "Influencer",
      "Cute"
    ]
  },
  {
    name: "Sophie",
    id: "sophie",
    modifier: "white British woman 32, lifestyle influencer, long wavy golden brown hair, warm freckled skin, bright friendly blue eyes, effortless natural beauty",
    r2Url: "https://asset.melies.co/actors/sophie-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Influencer",
    tags: [
      "Female",
      "30s",
      "White",
      "Influencer",
      "Cute",
      "Boho"
    ]
  },
  {
    name: "Ryan",
    id: "ryan",
    modifier: "white American man 29, fitness influencer, handsome clean-cut, short light brown hair, strong jawline, bright smile, healthy glowing skin",
    r2Url: "https://asset.melies.co/actors/ryan-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Influencer",
    tags: [
      "Male",
      "30s",
      "White",
      "Influencer",
      "Cute",
      "Sporty"
    ]
  },
  {
    name: "Fiona",
    id: "fiona",
    modifier: "Irish-American woman 26, natural redhead vivid auburn-copper hair, fair freckled skin, bright green eyes, distinctive naturally pretty",
    r2Url: "https://asset.melies.co/actors/fiona-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "White",
      "Everyday",
      "Ginger",
      "Cute"
    ]
  },
  {
    name: "Declan",
    id: "declan",
    modifier: "Irish man 28, natural dark ginger-red hair, full ginger beard, fair freckled skin, blue-green eyes, rugged friendly expression",
    r2Url: "https://asset.melies.co/actors/declan-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "White",
      "Everyday",
      "Ginger"
    ]
  },
  {
    name: "Thor",
    id: "thor",
    modifier: "white man 32, heavy metal style, very long straight black hair past shoulders, strong angular jaw, slight beard, intense brooding expression",
    r2Url: "https://asset.melies.co/actors/thor-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "White",
      "Everyday",
      "Metal",
      "Edgy"
    ]
  },
  {
    name: "Mason",
    id: "mason",
    modifier: "white American man 31, hipster, dark brown hair messy bun, full beard, ironic knowing expression, creative intellectual",
    r2Url: "https://asset.melies.co/actors/mason-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "White",
      "Everyday",
      "Hipster"
    ]
  },
  {
    name: "Zoe",
    id: "zoe",
    modifier: "mixed heritage woman 23, punk aesthetic, short electric blue-black dyed hair with undercut, multiple ear piercings, bold eye makeup, rebellious expression",
    r2Url: "https://asset.melies.co/actors/zoe-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "Mixed",
      "Everyday",
      "Punk",
      "Edgy"
    ]
  },
  {
    name: "Chad",
    id: "chad",
    modifier: "white American man 24, preppy Ivy League look, sandy blond hair neatly parted, clean-shaven, strong jaw, confident self-assured expression",
    r2Url: "https://asset.melies.co/actors/chad-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "White",
      "Everyday",
      "Preppy"
    ]
  },
  {
    name: "Cole",
    id: "cole",
    modifier: "white Australian man 25, surfer, sun-bleached sandy blond hair tousled, deeply tanned skin, easy-going bright smile, relaxed carefree",
    r2Url: "https://asset.melies.co/actors/cole-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "White",
      "Everyday",
      "Sporty",
      "Surfer"
    ]
  },
  {
    name: "Raven",
    id: "raven",
    modifier: "white woman 22, goth aesthetic, dyed jet black hair blunt fringe, very pale skin, dark dramatic eye makeup, septum piercing, intense gaze",
    r2Url: "https://asset.melies.co/actors/raven-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "White",
      "Everyday",
      "Goth",
      "Edgy"
    ]
  },
  {
    name: "Brock",
    id: "brock",
    modifier: "Black American man 28, bodybuilder, shaved head, strong powerful face, defined jaw, confident intense masculine expression",
    r2Url: "https://asset.melies.co/actors/brock-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "Black",
      "Everyday",
      "Sporty",
      "Athletic"
    ]
  },
  {
    name: "Meadow",
    id: "meadow",
    modifier: "white woman 29, bohemian hippie, long wavy natural honey-brown hair, warm glowing skin, soft dreamy eyes, free-spirited gentle expression",
    r2Url: "https://asset.melies.co/actors/meadow-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "White",
      "Everyday",
      "Boho"
    ]
  },
  {
    name: "Nova",
    id: "nova",
    modifier: "East Asian woman 20, e-girl aesthetic, pastel pink hair in space buns, large expressive eyes with colorful dramatic makeup, cute edgy expression",
    r2Url: "https://asset.melies.co/actors/nova-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "Asian",
      "Everyday",
      "Edgy",
      "Street"
    ]
  },
  {
    name: "Richard",
    id: "richard",
    modifier: "white American man 42, corporate executive, silver-streaked dark hair perfectly groomed, clean-shaven, sharp features, authoritative confident expression",
    r2Url: "https://asset.melies.co/actors/richard-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "White",
      "Everyday",
      "Preppy",
      "Professional"
    ]
  },
  {
    name: "Sasha",
    id: "sasha",
    modifier: "young white woman 21, platinum silver chin-length bob, light natural makeup, confident cool smirk, sharp cheekbones, trendy edgy style",
    r2Url: "https://asset.melies.co/actors/sasha-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "White",
      "Influencer",
      "Cute",
      "Street"
    ]
  },
  {
    name: "Mila",
    id: "mila",
    modifier: "young white woman 20, long straight brown hair, sweet girl-next-door look, warm friendly smile, minimal natural makeup, small hoop earrings",
    r2Url: "https://asset.melies.co/actors/mila-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "White",
      "Everyday",
      "Cute"
    ]
  },
  {
    name: "Jade",
    id: "jade",
    modifier: "young white woman 22, long straight blonde hair, bright confident smile, sparkling blue eyes, light glamorous makeup, bubbly energetic expression",
    r2Url: "https://asset.melies.co/actors/jade-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "White",
      "Influencer",
      "Cute",
      "Glam"
    ]
  },
  {
    name: "Kira",
    id: "kira",
    modifier: "young mixed-race woman 21, light brown skin, dark voluminous curly hair, energetic bright smile, athletic vibrant look, minimal dewy makeup",
    r2Url: "https://asset.melies.co/actors/kira-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Mixed",
      "Influencer",
      "Cute",
      "Athletic"
    ]
  },
  {
    name: "Noa",
    id: "noa",
    modifier: "young Mediterranean woman 23, olive skin, long dark brown wavy hair, dark expressive eyes, warm soft smile, sun-kissed natural beauty",
    r2Url: "https://asset.melies.co/actors/noa-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Mediterranean",
      "Influencer",
      "Cute"
    ]
  },
  {
    name: "Lexi",
    id: "lexi",
    modifier: "stunningly beautiful white woman 22, top model, long honey blonde waves, perfect symmetrical face, full glamorous smoky eye makeup, high cheekbones, piercing green eyes, flawless skin",
    r2Url: "https://asset.melies.co/actors/lexi-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "White",
      "Influencer",
      "Cute",
      "Glam"
    ]
  },
  {
    name: "Valentina",
    id: "valentina",
    modifier: "breathtakingly gorgeous Latina woman 23, supermodel beauty, long straight dark hair middle part, flawless caramel skin, full glossy lips, dramatic winged eyeliner, dark sultry eyes, perfect bone structure",
    r2Url: "https://asset.melies.co/actors/valentina-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Latina",
      "Influencer",
      "Cute",
      "Glam"
    ]
  },
  {
    name: "Hailey",
    id: "hailey",
    modifier: "young white woman 21, sporty cute, dirty blonde messy ponytail, light natural makeup rosy cheeks, bright hazel eyes, playful energetic smile, sun-kissed freckled skin",
    r2Url: "https://asset.melies.co/actors/hailey-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "White",
      "Influencer",
      "Cute",
      "Sporty"
    ]
  },
  {
    name: "Yuna",
    id: "yuna",
    modifier: "young Korean woman 21, K-beauty aesthetic, shoulder-length dark hair curtain bangs, soft dewy makeup gradient pink lips, large bright doe eyes, glowing porcelain skin, adorable sweet smile",
    r2Url: "https://asset.melies.co/actors/yuna-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Korean",
      "Influencer",
      "Cute"
    ]
  },
  {
    name: "Tessa",
    id: "tessa",
    modifier: "young white woman 22, striking natural redhead, long flowing copper-auburn hair, freckles, bold winged liner and red lip, bright blue-green eyes, confident fierce slight smile",
    r2Url: "https://asset.melies.co/actors/tessa-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "White",
      "Influencer",
      "Cute",
      "Ginger"
    ]
  },
  {
    name: "Axel",
    id: "axel",
    modifier: "young Scandinavian man 24, model looks, sandy blonde textured hair swept back, chiseled jaw, light stubble, icy blue eyes, sharp Nordic features, handsome relaxed expression",
    r2Url: "https://asset.melies.co/actors/axel-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Male",
      "20s",
      "White",
      "Influencer",
      "Cute"
    ]
  },
  {
    name: "Marco",
    id: "marco",
    modifier: "young Italian man 25, dark wavy hair pushed back, olive skin, dark brown eyes, designer stubble, strong jaw, warm charming smolder, classically handsome",
    r2Url: "https://asset.melies.co/actors/marco-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Male",
      "20s",
      "Mediterranean",
      "Influencer",
      "Cute"
    ]
  },
  {
    name: "Jayden",
    id: "jayden",
    modifier: "young mixed-race man 22, light brown skin, short curly fade, athletic, bright white smile, warm brown eyes, clean-shaven, high cheekbones, charismatic friendly",
    r2Url: "https://asset.melies.co/actors/jayden-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Male",
      "20s",
      "Mixed",
      "Influencer",
      "Cute",
      "Athletic"
    ]
  },
  {
    name: "Theo",
    id: "theo",
    modifier: "young French man 23, soft wavy brown hair falling across forehead, warm brown eyes, light stubble, gentle charming smile, tousled romantic look, soft defined features",
    r2Url: "https://asset.melies.co/actors/theo-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "White",
      "Everyday",
      "Cute"
    ]
  },
  {
    name: "Dae",
    id: "dae",
    modifier: "young Korean man 22, K-pop inspired, perfectly styled dark hair comma bangs, flawless clear skin, sharp expressive eyes, soft handsome features, cool confident slight smile",
    r2Url: "https://asset.melies.co/actors/dae-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Male",
      "20s",
      "Korean",
      "Influencer",
      "Cute"
    ]
  },
  {
    name: "Titan",
    id: "titan",
    modifier: "massive white male bodybuilder 32, extremely muscular huge arms and chest, thick neck, short buzzcut, tanned skin, veiny, intense focused expression, enormous physique",
    r2Url: "https://asset.melies.co/actors/titan-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "White",
      "Everyday",
      "Muscular",
      "Athletic"
    ]
  },
  {
    name: "Serena",
    id: "serena",
    modifier: "muscular Black female bodybuilder 28, very defined shoulders and arms, powerful athletic build, dark skin, short cropped natural hair, strong confident expression",
    r2Url: "https://asset.melies.co/actors/serena-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Female",
      "20s",
      "African",
      "Everyday",
      "Muscular",
      "Athletic"
    ]
  },
  {
    name: "Gus",
    id: "gus",
    modifier: "very fat white man 44, large round face double chin, very overweight obese, short messy brown hair, scruffy beard, warm jovial big smile, rosy cheeks",
    r2Url: "https://asset.melies.co/actors/gus-full.webp",
    gender: "Male",
    ageGroup: "40s",
    type: "Everyday",
    tags: [
      "Male",
      "40s",
      "White",
      "Everyday",
      "Plus-Size"
    ]
  },
  {
    name: "Rosie",
    id: "rosie",
    modifier: "very fat white woman 34, plus-size obese, large round face full cheeks double chin, long curly red-brown hair, bright blue eyes, confident radiant smile, bold red lipstick",
    r2Url: "https://asset.melies.co/actors/rosie-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Female",
      "30s",
      "White",
      "Everyday",
      "Plus-Size"
    ]
  },
  {
    name: "Amani",
    id: "amani",
    modifier: "beautiful Black woman with vitiligo 25, striking patches of depigmented white skin across face and neck, dark brown skin, short natural hair, large dark eyes, confident serene expression",
    r2Url: "https://asset.melies.co/actors/amani-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "African",
      "Influencer",
      "Unique"
    ]
  },
  {
    name: "Edith",
    id: "edith",
    modifier: "very old white grandmother 82, deeply wrinkled weathered face, thin white curly hair, kind warm gentle smile, soft pale blue eyes, small round glasses, pearl earrings, loving grandmotherly",
    r2Url: "https://asset.melies.co/actors/edith-full.webp",
    gender: "Female",
    ageGroup: "80s+",
    type: "Everyday",
    tags: [
      "Female",
      "80s+",
      "White",
      "Everyday"
    ]
  },
  {
    name: "Tommy",
    id: "tommy",
    modifier: "young white man with Down syndrome 22, characteristic almond-shaped eyes flat nasal bridge, short brown hair neatly combed, bright warm genuine happy smile, joyful friendly expression",
    r2Url: "https://asset.melies.co/actors/tommy-full.webp",
    gender: "Male",
    ageGroup: "20s",
    type: "Everyday",
    tags: [
      "Male",
      "20s",
      "White",
      "Everyday",
      "Unique"
    ]
  },
  {
    name: "Nia",
    id: "nia",
    modifier: "stunning African woman with albinism 24, very pale white skin African features, long straight white-blonde hair, light blue-grey eyes, ethereal otherworldly beauty, serene confident",
    r2Url: "https://asset.melies.co/actors/nia-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "African",
      "Influencer",
      "Unique"
    ]
  },
  {
    name: "Sage",
    id: "sage",
    modifier: "white woman with alopecia 31, completely bald smooth head, striking bold, large green eyes, bold dramatic eye makeup dark liner, defined cheekbones, fierce confident powerful expression",
    r2Url: "https://asset.melies.co/actors/sage-full.webp",
    gender: "Female",
    ageGroup: "30s",
    type: "Influencer",
    tags: [
      "Female",
      "30s",
      "White",
      "Influencer",
      "Edgy",
      "Unique"
    ]
  },
  {
    name: "Rex",
    id: "rex",
    modifier: "heavily tattooed white man 33, full neck and face tattoos, sleeve tattoos both arms, shaved head, strong jaw short dark beard, intense piercing blue eyes, multiple piercings, tough calm expression",
    r2Url: "https://asset.melies.co/actors/rex-full.webp",
    gender: "Male",
    ageGroup: "30s",
    type: "Everyday",
    tags: [
      "Male",
      "30s",
      "White",
      "Everyday",
      "Tattooed",
      "Edgy"
    ]
  },
  {
    name: "Sienna",
    id: "sienna",
    modifier: "impossibly gorgeous white woman 21, top model thin, long blown-out chestnut hair, full contoured TikTok makeup, sculpted cheekbones bronzer, fluffy lash extensions, glossy nude lip, flawless skin, doe-eyed seductive innocent",
    r2Url: "https://asset.melies.co/actors/sienna-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "White",
      "Influencer",
      "Cute",
      "Glam"
    ]
  },
  {
    name: "Lola",
    id: "lola",
    modifier: "stunningly beautiful Black woman 22, TikTok influencer, long sleek straight dark hair, rich dark skin, full glam makeup highlight cheekbones, bold winged liner, long lashes, glossy berry lips, supermodel confident",
    r2Url: "https://asset.melies.co/actors/lola-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Black",
      "Influencer",
      "Cute",
      "Glam"
    ]
  },
  {
    name: "Mika",
    id: "mika",
    modifier: "incredibly cute half-Asian half-white woman 20, thin model face, wispy curtain bangs long dark hair, dewy glass skin soft blush shimmer, gradient cherry lips, sparkly eyes subtle liner, sweet flirty TikTok smile",
    r2Url: "https://asset.melies.co/actors/mika-full.webp",
    gender: "Female",
    ageGroup: "20s",
    type: "Influencer",
    tags: [
      "Female",
      "20s",
      "Asian",
      "Mixed",
      "Influencer",
      "Cute",
      "Glam"
    ]
  }
];

// src/utils/actors.ts
var actors = actors_default;
function findActor(name) {
  const lower = name.toLowerCase();
  return actors.find((a) => a.name.toLowerCase() === lower || a.id.toLowerCase() === lower) || null;
}
function searchActors(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return actors.filter((a) => {
    const searchable = [
      a.name.toLowerCase(),
      a.id.toLowerCase(),
      a.type.toLowerCase(),
      a.gender.toLowerCase(),
      a.ageGroup.toLowerCase(),
      ...a.tags.map((t) => t.toLowerCase())
    ].join(" ");
    return words.every((word) => searchable.includes(word));
  });
}
function filterActors(options) {
  let result = actors;
  if (options.type) {
    const lower = options.type.toLowerCase();
    result = result.filter((a) => a.type.toLowerCase() === lower);
  }
  if (options.gender) {
    const lower = options.gender.toLowerCase();
    result = result.filter((a) => a.gender.toLowerCase() === lower);
  }
  if (options.age) {
    const lower = options.age.toLowerCase();
    result = result.filter((a) => a.ageGroup.toLowerCase() === lower);
  }
  return result;
}
function getAllActors() {
  return actors;
}

// src/utils/download.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const dir = path2.dirname(outputPath);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  fs2.writeFileSync(outputPath, buffer);
  return outputPath;
}

// src/utils/style-options.ts
function addStyleOptions(yargs2) {
  return yargs2.option("camera", { type: "string", description: "Camera angle (eye-level, high, low, overhead, dutch, ots, profile, three-quarter)" }).option("shot", { type: "string", description: "Shot size (ecu, close-up, medium, cowboy, full-body, wide, tighter, wider)" }).option("expression", { type: "string", description: "Expression (smile, laugh, serious, surprised, villain-smirk, seductive, horrified)" }).option("lighting", { type: "string", description: "Lighting (soft, golden, noir, rembrandt, backlit, neon, candle, hard)" }).option("time", { type: "string", description: "Time of day (dawn, sunrise, golden, dusk, night, morning, midday)" }).option("weather", { type: "string", description: "Weather (clear, fog, rain, storm, snow, overcast, mist)" }).option("colorGrade", { alias: "color-grade", type: "string", description: "Color grade (natural, teal-orange, mono, warm, cool, filmic, sepia)" }).option("mood", { type: "string", description: "Mood (romantic, mysterious, tense, ethereal, gritty, epic, nostalgic)" }).option("artStyle", { alias: "art-style", type: "string", description: "Art style (film-still, blockbuster, noir, anime, ghibli, oil, watercolor, concept)" }).option("era", { type: "string", description: "Era (victorian, 1920s, 1980s, modern, dystopian, medieval)" }).option("movement", { type: "string", description: "Camera movement for video (dolly-in, pan-left, orbit-360, crane-up, slow-zoom-in, handheld, static)" });
}
function addQualityOptions(yargs2) {
  return yargs2.option("fast", { type: "boolean", description: "Use the fastest model (default)" }).option("quality", { type: "boolean", description: "Use a higher quality model" }).option("best", { type: "boolean", description: "Use the best available model" });
}
function addActorOption(yargs2) {
  return yargs2.option("actor", { type: "string", description: 'Built-in AI actor name (run "melies actors" to browse)' });
}
function addGenerationOptions(yargs2) {
  return yargs2.option("dryRun", { alias: "dry-run", type: "boolean", description: "Show what would happen without generating" }).option("seed", { type: "number", description: "Seed for reproducible generation" }).option("output", { alias: "o", type: "string", description: "Output file path (use with --sync)" });
}

// src/commands/image.ts
var imageCommand = {
  command: "image <prompt>",
  describe: "Generate an image from a text prompt",
  builder: (yargs2) => {
    let y = yargs2.positional("prompt", {
      type: "string",
      description: "Text prompt describing the image",
      demandOption: true
    }).option("model", {
      alias: "m",
      type: "string",
      description: "Image model to use (overrides quality presets)"
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
      description: "Reference ID (actor/object) for consistent characters"
    }).option("sref", {
      type: "string",
      description: "Style reference code for visual style consistency"
    }).option("sync", {
      alias: "s",
      type: "boolean",
      default: false,
      description: "Wait for generation to complete and return the URL"
    });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addActorOption(y);
    y = addGenerationOptions(y);
    return y;
  },
  handler: async (argv) => {
    try {
      const model = resolveModel("image", argv);
      let actorModifier;
      let actorRef;
      if (argv.actor) {
        const actor = findActor(argv.actor);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${argv.actor}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifier = actor.modifier;
        actorRef = actor.r2Url;
      }
      const styleOptions = {};
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.expression) styleOptions.expression = argv.expression;
      if (argv.lighting) styleOptions.lighting = argv.lighting;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;
      const rawPrompt = actorModifier ? `${actorModifier}, ${argv.prompt}` : argv.prompt;
      if (argv.dryRun) {
        const credits = getPresetCredits("image", argv);
        console.log(JSON.stringify({
          model,
          prompt: rawPrompt,
          styleOptions: Object.keys(styleOptions).length > 0 ? styleOptions : void 0,
          credits: credits || "varies by model",
          aspectRatio: argv.aspectRatio,
          numOutputs: argv.numOutputs,
          actor: argv.actor || null,
          sref: argv.sref || null,
          seed: argv.seed || null
        }, null, 2));
        return;
      }
      const token = getToken();
      const api = new MeliesAPI(token);
      const params = {
        prompt: rawPrompt,
        model,
        aspectRatio: argv.aspectRatio,
        numOutputs: argv.numOutputs
      };
      if (Object.keys(styleOptions).length > 0) params.styleOptions = styleOptions;
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.seed) params.seed = argv.seed;
      const refs = [];
      if (argv.ref) refs.push(argv.ref);
      if (actorRef) params.imageUrl = params.imageUrl || actorRef;
      if (refs.length > 0) params.refs = refs;
      if (argv.sref) {
        const srefData = await api.getSrefStyle(argv.sref);
        if (srefData?.imageUrl) {
          params.srefImageUrl = srefData.imageUrl;
        }
      }
      const result = await api.executeTool("text_to_image", params);
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
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
    await new Promise((resolve2) => setTimeout(resolve2, interval));
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
  builder: (yargs2) => {
    let y = yargs2.positional("prompt", {
      type: "string",
      description: "Text prompt describing the video",
      demandOption: true
    }).option("model", {
      alias: "m",
      type: "string",
      description: "Video model to use (overrides quality presets)"
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
      description: "Reference ID (actor/object) for consistent characters"
    }).option("sync", {
      alias: "s",
      type: "boolean",
      default: false,
      description: "Wait for generation to complete and return the URL"
    });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addActorOption(y);
    y = addGenerationOptions(y);
    return y;
  },
  handler: async (argv) => {
    try {
      const model = resolveModel("video", argv);
      let actorModifier;
      let actorRef;
      if (argv.actor) {
        const actor = findActor(argv.actor);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${argv.actor}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifier = actor.modifier;
        actorRef = actor.r2Url;
      }
      const styleOptions = {};
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.expression) styleOptions.expression = argv.expression;
      if (argv.lighting) styleOptions.lighting = argv.lighting;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;
      if (argv.movement) styleOptions.movement = argv.movement;
      const rawPrompt = actorModifier ? `${actorModifier}, ${argv.prompt}` : argv.prompt;
      if (argv.dryRun) {
        const credits = getPresetCredits("video", argv);
        console.log(JSON.stringify({
          model,
          prompt: rawPrompt,
          styleOptions: Object.keys(styleOptions).length > 0 ? styleOptions : void 0,
          credits: credits || "varies by model",
          aspectRatio: argv.aspectRatio,
          duration: argv.duration || null,
          actor: argv.actor || null,
          seed: argv.seed || null
        }, null, 2));
        return;
      }
      const token = getToken();
      const api = new MeliesAPI(token);
      const params = {
        prompt: rawPrompt,
        model,
        aspectRatio: argv.aspectRatio
      };
      if (Object.keys(styleOptions).length > 0) params.styleOptions = styleOptions;
      if (argv.imageUrl) params.imageUrl = argv.imageUrl;
      if (argv.duration) params.duration = argv.duration;
      if (argv.resolution) params.resolution = argv.resolution;
      if (argv.ref) params.refs = [argv.ref];
      if (argv.seed) params.seed = argv.seed;
      if (actorRef && !argv.imageUrl) params.imageUrl = actorRef;
      const result = await api.executeTool("text_to_video", params);
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId, 3e5);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
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

// src/data/poster-styles.json
var poster_styles_default = [
  {
    id: "cinematic",
    name: "Cinematic",
    icon: "\u{1F3AC}",
    description: "Photorealistic Hollywood blockbuster",
    promptSuffix: "photorealistic cinematic movie poster, dramatic lighting, Hollywood blockbuster style, professional film poster composition, high contrast, epic scale"
  },
  {
    id: "anime",
    name: "Anime",
    icon: "\u26E9\uFE0F",
    description: "Japanese animation style",
    promptSuffix: "vibrant anime art style movie poster, cel-shaded, Japanese animation aesthetic, dynamic composition, vivid colors, manga-inspired illustration"
  },
  {
    id: "retro",
    name: "Retro",
    icon: "\u{1F4FC}",
    description: "1960s-70s vintage aesthetic",
    promptSuffix: "retro vintage 1970s movie poster style, worn paper texture, muted color palette, classic typography, old Hollywood golden age aesthetic, grain texture"
  },
  {
    id: "film-noir",
    name: "Film Noir",
    icon: "\u{1F575}\uFE0F",
    description: "High contrast black & white",
    promptSuffix: "film noir movie poster, high contrast black and white, dramatic shadows, detective story aesthetic, venetian blind lighting, smoke and mystery atmosphere"
  },
  {
    id: "minimalist",
    name: "Minimalist",
    icon: "\u25FB\uFE0F",
    description: "Clean and simple composition",
    promptSuffix: "minimalist movie poster design, clean composition, bold simple shapes, limited color palette, strong negative space, modern graphic design aesthetic"
  },
  {
    id: "horror",
    name: "Horror",
    icon: "\u{1F480}",
    description: "Dark and unsettling atmosphere",
    promptSuffix: "horror movie poster, dark unsettling atmosphere, eerie lighting, distressed textures, creepy shadows, ominous mood, blood red and black color scheme"
  },
  {
    id: "sci-fi",
    name: "Sci-Fi",
    icon: "\u{1F680}",
    description: "Futuristic and cyberpunk",
    promptSuffix: "science fiction movie poster, futuristic neon lights, space themes, cyberpunk elements, holographic effects, advanced technology aesthetic, cosmic scale"
  },
  {
    id: "watercolor",
    name: "Watercolor",
    icon: "\u{1F3A8}",
    description: "Soft painted look",
    promptSuffix: "watercolor art style movie poster, soft flowing colors, artistic brushstrokes, delicate washes, painterly composition, dreamy ethereal quality"
  },
  {
    id: "comic-book",
    name: "Comic Book",
    icon: "\u{1F4A5}",
    description: "Bold outlines and pop art",
    promptSuffix: "comic book style movie poster, bold black outlines, halftone dots, pop art aesthetic, vibrant saturated colors, action panels, speech bubble style typography"
  },
  {
    id: "art-deco",
    name: "Art Deco",
    icon: "\u{1F3DB}\uFE0F",
    description: "1920s-30s geometric glamour",
    promptSuffix: "art deco style movie poster, geometric patterns, gold and black accents, 1920s-1930s glamour, ornate symmetrical design, Gatsby era elegance"
  },
  {
    id: "grindhouse",
    name: "Grindhouse",
    icon: "\u{1F525}",
    description: "Exploitation film style",
    promptSuffix: "grindhouse exploitation movie poster, grainy film texture, bold garish colors, over-the-top dramatic poses, 1970s B-movie aesthetic, distressed worn print"
  },
  {
    id: "bollywood",
    name: "Bollywood",
    icon: "\u2728",
    description: "Vibrant and ornate",
    promptSuffix: "Bollywood movie poster style, vibrant rich colors, ornate decorative details, dramatic poses, glamorous aesthetic, elaborate composition, festive energy"
  },
  {
    id: "western",
    name: "Western",
    icon: "\u{1F920}",
    description: "Dusty frontier textures",
    promptSuffix: "western movie poster, dusty textures, sepia and earth tones, frontier typography, desert landscape, cowboy aesthetic, wanted poster influenced design"
  },
  {
    id: "pixel-art",
    name: "Pixel Art",
    icon: "\u{1F47E}",
    description: "Retro 8/16-bit game style",
    promptSuffix: "pixel art retro movie poster, 16-bit video game aesthetic, pixelated characters, limited color palette, nostalgic gaming art style, crisp pixel edges"
  },
  {
    id: "surrealist",
    name: "Surrealist",
    icon: "\u{1F300}",
    description: "Dreamlike impossible scenes",
    promptSuffix: "surrealist movie poster, dreamlike impossible scenes, Salvador Dali inspired, melting forms, bizarre juxtapositions, subconscious imagery, otherworldly atmosphere"
  },
  {
    id: "documentary",
    name: "Documentary",
    icon: "\u{1F4F0}",
    description: "Clean editorial photography",
    promptSuffix: "documentary film poster, clean journalistic style, photography-based, editorial composition, muted tones, serious tone, informative layout"
  },
  {
    id: "cartoon",
    name: "Cartoon",
    icon: "\u{1F3AA}",
    description: "Animated feature style",
    promptSuffix: "cartoon animated movie poster, hand-drawn colorful style, Disney/Pixar inspired, exaggerated features, playful composition, family-friendly, bright vibrant colors"
  },
  {
    id: "epic-fantasy",
    name: "Epic Fantasy",
    icon: "\u2694\uFE0F",
    description: "Sweeping magical landscapes",
    promptSuffix: "epic fantasy movie poster, sweeping landscapes, magical elements, Lord of the Rings inspired, mythical creatures, dramatic sky, heroic composition, painterly realism"
  },
  {
    id: "indie-film",
    name: "Indie Film",
    icon: "\u{1F39E}\uFE0F",
    description: "Muted artistic aesthetic",
    promptSuffix: "indie film poster, muted desaturated tones, artistic composition, festival poster aesthetic, thoughtful framing, understated elegance, photography-driven"
  },
  {
    id: "neon-noir",
    name: "Neon Noir",
    icon: "\u{1F303}",
    description: "Rain-soaked neon streets",
    promptSuffix: "neon noir movie poster, rain-soaked night streets, neon signs reflecting on wet pavement, gritty urban atmosphere, electric blue and pink neon glow, moody detective aesthetic"
  }
];

// src/commands/poster.ts
var posterCommand = {
  command: "poster <title>",
  describe: "Generate a movie poster from a title, logline, and genre",
  builder: (yargs2) => {
    let y = yargs2.positional("title", {
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
    }).option("style", {
      type: "string",
      description: "Poster style preset (cinematic, anime, noir, ghibli, etc.). Run with --dry-run to preview."
    }).option("model", {
      alias: "m",
      type: "string",
      description: "Image model to use (overrides quality presets)"
    }).option("aspectRatio", {
      alias: "a",
      type: "string",
      default: "3:4",
      description: "Aspect ratio (3:4, 2:3, 1:1, 4:3)"
    }).option("actor", {
      type: "string",
      array: true,
      description: "AI actor name(s). Use multiple --actor flags for multiple actors."
    }).option("ref", {
      type: "string",
      description: "Reference ID (actor/object) for consistent characters"
    }).option("sync", {
      alias: "s",
      type: "boolean",
      default: false,
      description: "Wait for generation to complete and return the URL"
    });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addGenerationOptions(y);
    return y;
  },
  handler: async (argv) => {
    try {
      const model = resolveModel("image", { ...argv, model: argv.model || "flux-dev" });
      let styleSuffix = "";
      if (argv.style) {
        const styleLower = argv.style.toLowerCase();
        const styles = poster_styles_default;
        const found = styles.find(
          (s) => s.id === styleLower || s.name.toLowerCase() === styleLower || s.id.includes(styleLower) || s.name.toLowerCase().includes(styleLower)
        );
        if (found) {
          styleSuffix = found.promptSuffix;
        } else {
          console.error(JSON.stringify({
            error: `Style "${argv.style}" not found. Available: ${styles.map((s) => s.id).join(", ")}`
          }));
          process.exit(1);
        }
      }
      const actorModifiers = [];
      const actors2 = argv.actor || [];
      for (const actorName of actors2) {
        const actor = findActor(actorName);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${actorName}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifiers.push(actor.modifier);
      }
      const styleOptions = {};
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.expression) styleOptions.expression = argv.expression;
      if (argv.lighting) styleOptions.lighting = argv.lighting;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;
      let rawPrompt = `Movie poster for "${argv.title}"`;
      if (argv.logline) rawPrompt += `. ${argv.logline}`;
      if (argv.genre) rawPrompt += `. Genre: ${argv.genre}`;
      if (actorModifiers.length > 0) rawPrompt += `. Starring: ${actorModifiers.join(" and ")}`;
      if (styleSuffix) rawPrompt += `. ${styleSuffix}`;
      const hasStyleOptions = Object.keys(styleOptions).length > 0;
      if (argv.dryRun) {
        const credits = getPresetCredits("image", { ...argv, model: argv.model || "flux-dev" });
        console.log(JSON.stringify({
          model,
          prompt: rawPrompt,
          styleOptions: hasStyleOptions ? styleOptions : void 0,
          credits: credits || "varies by model",
          aspectRatio: argv.aspectRatio,
          style: argv.style || null,
          actors: actors2.length > 0 ? actors2 : null,
          seed: argv.seed || null
        }, null, 2));
        return;
      }
      const token = getToken();
      const api = new MeliesAPI(token);
      const params = {
        prompt: rawPrompt,
        model,
        aspectRatio: argv.aspectRatio
      };
      if (hasStyleOptions) params.styleOptions = styleOptions;
      if (argv.ref) params.refs = [argv.ref];
      if (argv.seed) params.seed = argv.seed;
      const result = await api.executeTool("poster_generator", params);
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
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

// src/commands/actors.ts
var actorsSearchCommand = {
  command: "search <query>",
  describe: "Search actors by name, tags, or description",
  builder: (yargs2) => yargs2.positional("query", {
    type: "string",
    description: "Search query",
    demandOption: true
  }),
  handler: (argv) => {
    const results = searchActors(argv.query);
    if (results.length === 0) {
      console.log(JSON.stringify({ results: [], message: `No actors found for "${argv.query}"` }));
      return;
    }
    const output = results.map((a) => ({
      name: a.name,
      type: a.type,
      gender: a.gender,
      age: a.ageGroup,
      tags: a.tags
    }));
    console.log(JSON.stringify(output, null, 2));
  }
};
var actorsCommand = {
  command: "actors",
  describe: "Browse 148 built-in AI actors",
  builder: (yargs2) => yargs2.command(actorsSearchCommand).option("type", {
    alias: "t",
    type: "string",
    description: "Filter by type (Actor, Influencer, Everyday, Character, Senior)"
  }).option("gender", {
    alias: "g",
    type: "string",
    description: "Filter by gender (Male, Female)"
  }).option("age", {
    type: "string",
    description: "Filter by age group (20s, 30s, 40s, 50s, 60s, 70s)"
  }),
  handler: (argv) => {
    const hasFilters = argv.type || argv.gender || argv.age;
    const results = hasFilters ? filterActors({ type: argv.type, gender: argv.gender, age: argv.age }) : getAllActors();
    const output = results.map((a) => ({
      name: a.name,
      type: a.type,
      gender: a.gender,
      age: a.ageGroup,
      tags: a.tags
    }));
    console.log(JSON.stringify(output, null, 2));
  }
};

// src/commands/styles.ts
var stylesSearchCommand = {
  command: "search <keyword>",
  describe: "Search style references by keyword",
  builder: (yargs2) => yargs2.positional("keyword", {
    type: "string",
    description: 'Keyword to search (e.g. "cyberpunk", "watercolor")',
    demandOption: true
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const results = await api.searchSrefStyles(argv.keyword);
      console.log(JSON.stringify(results, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};
var stylesTopCommand = {
  command: "top",
  describe: "Show popular style reference keywords",
  handler: async () => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const results = await api.getTopSrefKeywords();
      console.log(JSON.stringify(results, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};
var stylesInfoCommand = {
  command: "info <code>",
  describe: "Get details for a specific style reference code",
  builder: (yargs2) => yargs2.positional("code", {
    type: "string",
    description: "Sref code to look up",
    demandOption: true
  }),
  handler: async (argv) => {
    try {
      const token = getToken();
      const api = new MeliesAPI(token);
      const result = await api.getSrefStyle(argv.code);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};
var stylesCommand = {
  command: "styles",
  describe: "Browse and search style references (sref codes)",
  builder: (yargs2) => yargs2.command(stylesSearchCommand).command(stylesTopCommand).command(stylesInfoCommand).demandCommand(1, 'Run "melies styles --help" to see subcommands'),
  handler: () => {
  }
};

// src/commands/upscale.ts
var UPSCALE_MODELS = {
  esrgan: { credits: 3, description: "Fast general-purpose upscaling" },
  clarity: { credits: 8, description: "High quality with detail enhancement" },
  seedvr2: { credits: 5, description: "Balanced quality and speed" }
};
var upscaleCommand = {
  command: "upscale <imageUrl>",
  describe: "Upscale an image to higher resolution",
  builder: (yargs2) => yargs2.positional("imageUrl", {
    type: "string",
    description: "URL of the image to upscale",
    demandOption: true
  }).option("model", {
    alias: "m",
    type: "string",
    default: "esrgan",
    choices: ["esrgan", "clarity", "seedvr2"],
    description: "Upscaling model to use"
  }).option("scale", {
    type: "number",
    default: 2,
    choices: [2, 4],
    description: "Scale factor (2x or 4x, 4x costs double)"
  }).option("sync", {
    alias: "s",
    type: "boolean",
    default: false,
    description: "Wait for completion and return the URL"
  }).option("dryRun", {
    alias: "dry-run",
    type: "boolean",
    description: "Show what would happen without generating"
  }).option("output", {
    alias: "o",
    type: "string",
    description: "Output file path (use with --sync)"
  }),
  handler: async (argv) => {
    try {
      const modelInfo = UPSCALE_MODELS[argv.model || "esrgan"];
      const credits = modelInfo.credits * (argv.scale === 4 ? 2 : 1);
      if (argv.dryRun) {
        console.log(JSON.stringify({
          model: argv.model,
          scale: argv.scale,
          credits,
          imageUrl: argv.imageUrl
        }, null, 2));
        return;
      }
      const token = getToken();
      const api = new MeliesAPI(token);
      const result = await api.executeTool("upscale-image", {
        imageUrl: argv.imageUrl,
        model: argv.model,
        scale: argv.scale
      });
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: "pending",
          message: 'Upscaling started. Use "melies status <assetId>" to check progress.'
        }, null, 2));
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/remove-bg.ts
var removeBgCommand = {
  command: "remove-bg <imageUrl>",
  describe: "Remove the background from an image (3 credits)",
  builder: (yargs2) => yargs2.positional("imageUrl", {
    type: "string",
    description: "URL of the image to process",
    demandOption: true
  }).option("sync", {
    alias: "s",
    type: "boolean",
    default: false,
    description: "Wait for completion and return the URL"
  }).option("dryRun", {
    alias: "dry-run",
    type: "boolean",
    description: "Show what would happen without generating"
  }).option("output", {
    alias: "o",
    type: "string",
    description: "Output file path (use with --sync)"
  }),
  handler: async (argv) => {
    try {
      if (argv.dryRun) {
        console.log(JSON.stringify({
          tool: "remove-background",
          credits: 3,
          imageUrl: argv.imageUrl
        }, null, 2));
        return;
      }
      const token = getToken();
      const api = new MeliesAPI(token);
      const result = await api.executeTool("remove-background", {
        imageUrl: argv.imageUrl
      });
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: "pending",
          message: 'Background removal started. Use "melies status <assetId>" to check progress.'
        }, null, 2));
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/thumbnail.ts
var thumbnailCommand = {
  command: "thumbnail <prompt>",
  describe: "Generate YouTube thumbnails (16:9, optimized for click-through)",
  builder: (yargs2) => {
    let y = yargs2.positional("prompt", {
      type: "string",
      description: "Text prompt describing the thumbnail",
      demandOption: true
    }).option("model", {
      alias: "m",
      type: "string",
      description: "Image model to use (overrides quality presets)"
    }).option("numOutputs", {
      alias: "n",
      type: "number",
      default: 1,
      description: "Number of thumbnails to generate (1-4)"
    }).option("ref", {
      type: "string",
      description: "Reference ID for consistent characters"
    }).option("sync", {
      alias: "s",
      type: "boolean",
      default: false,
      description: "Wait for generation to complete and return the URL"
    });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addActorOption(y);
    y = addGenerationOptions(y);
    return y;
  },
  handler: async (argv) => {
    try {
      const model = resolveModel("image", argv);
      let actorModifier;
      let actorRef;
      if (argv.actor) {
        const actor = findActor(argv.actor);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${argv.actor}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifier = actor.modifier;
        actorRef = actor.r2Url;
      }
      const styleOptions = {};
      styleOptions.expression = argv.expression || "smile";
      styleOptions.lighting = argv.lighting || "soft";
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;
      const rawPrompt = actorModifier ? `${actorModifier}, YouTube thumbnail: ${argv.prompt}, bold vibrant colors, high contrast, eye-catching composition` : `YouTube thumbnail: ${argv.prompt}, bold vibrant colors, high contrast, eye-catching composition`;
      if (argv.dryRun) {
        const credits = getPresetCredits("image", argv);
        console.log(JSON.stringify({
          model,
          prompt: rawPrompt,
          styleOptions,
          credits: credits || "varies by model",
          aspectRatio: "16:9",
          numOutputs: argv.numOutputs,
          actor: argv.actor || null,
          seed: argv.seed || null
        }, null, 2));
        return;
      }
      const token = getToken();
      const api = new MeliesAPI(token);
      const params = {
        prompt: rawPrompt,
        model,
        aspectRatio: "16:9",
        numOutputs: argv.numOutputs,
        styleOptions
      };
      if (argv.ref) params.refs = [argv.ref];
      if (argv.seed) params.seed = argv.seed;
      if (actorRef) params.imageUrl = actorRef;
      const result = await api.executeTool("text_to_image", params);
      if (argv.sync) {
        const asset = await pollAsset(api, result.assetId);
        if (asset.url && argv.output) {
          const filePath = await downloadFile(asset.url, argv.output);
          asset.savedTo = filePath;
        }
        console.log(JSON.stringify(asset, null, 2));
      } else {
        console.log(JSON.stringify({
          assetId: result.assetId,
          status: "pending",
          message: 'Thumbnail generation started. Use "melies status <assetId>" to check progress.'
        }, null, 2));
      }
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/commands/pipeline.ts
var pipelineCommand = {
  command: "pipeline <prompt>",
  describe: "Generate an image then animate it into a video (image -> video chain)",
  builder: (yargs2) => {
    let y = yargs2.positional("prompt", {
      type: "string",
      description: "Text prompt describing the scene",
      demandOption: true
    }).option("imageModel", {
      alias: "im",
      type: "string",
      description: "Image model override"
    }).option("videoModel", {
      alias: "vm",
      type: "string",
      description: "Video model override"
    }).option("aspectRatio", {
      alias: "a",
      type: "string",
      default: "16:9",
      description: "Aspect ratio for both image and video"
    }).option("duration", {
      alias: "d",
      type: "number",
      description: "Video duration in seconds"
    }).option("sync", {
      alias: "s",
      type: "boolean",
      default: true,
      description: "Wait for both generations (default: true for pipeline)"
    });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addActorOption(y);
    y = addGenerationOptions(y);
    return y;
  },
  handler: async (argv) => {
    try {
      const imageModel = argv.imageModel || resolveModel("image", argv);
      const videoModel = argv.videoModel || resolveModel("video", argv);
      let actorModifier;
      let actorRef;
      if (argv.actor) {
        const actor = findActor(argv.actor);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${argv.actor}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifier = actor.modifier;
        actorRef = actor.r2Url;
      }
      const styleOptions = {};
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.expression) styleOptions.expression = argv.expression;
      if (argv.lighting) styleOptions.lighting = argv.lighting;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;
      if (argv.movement) styleOptions.movement = argv.movement;
      const rawPrompt = actorModifier ? `${actorModifier}, ${argv.prompt}` : argv.prompt;
      const hasStyleOptions = Object.keys(styleOptions).length > 0;
      if (argv.dryRun) {
        const imageCredits = getPresetCredits("image", { ...argv, model: argv.imageModel });
        const videoCredits = getPresetCredits("video", { ...argv, model: argv.videoModel });
        console.log(JSON.stringify({
          step1: {
            type: "image",
            model: imageModel,
            credits: imageCredits || "varies by model"
          },
          step2: {
            type: "video",
            model: videoModel,
            credits: videoCredits || "varies by model"
          },
          prompt: rawPrompt,
          styleOptions: hasStyleOptions ? styleOptions : void 0,
          aspectRatio: argv.aspectRatio,
          duration: argv.duration || null,
          actor: argv.actor || null,
          seed: argv.seed || null
        }, null, 2));
        return;
      }
      const token = getToken();
      const api = new MeliesAPI(token);
      console.error("Step 1/2: Generating image...");
      const imageParams = {
        prompt: rawPrompt,
        model: imageModel,
        aspectRatio: argv.aspectRatio,
        numOutputs: 1
      };
      if (hasStyleOptions) imageParams.styleOptions = styleOptions;
      if (argv.seed) imageParams.seed = argv.seed;
      if (actorRef) imageParams.imageUrl = actorRef;
      const imageResult = await api.executeTool("text_to_image", imageParams);
      const imageAsset = await pollAsset(api, imageResult.assetId);
      if (imageAsset.status !== "completed" || !imageAsset.url) {
        console.error(JSON.stringify({ error: "Image generation failed", details: imageAsset }));
        process.exit(1);
      }
      console.error(`Step 1/2: Image ready: ${imageAsset.url}`);
      console.error("Step 2/2: Generating video from image...");
      const videoParams = {
        prompt: argv.prompt,
        model: videoModel,
        imageUrl: imageAsset.url,
        aspectRatio: argv.aspectRatio
      };
      if (argv.duration) videoParams.duration = argv.duration;
      const videoResult = await api.executeTool("text_to_video", videoParams);
      const videoAsset = await pollAsset(api, videoResult.assetId, 3e5);
      const output = {
        status: videoAsset.status,
        imageUrl: imageAsset.url,
        imageAssetId: imageAsset.assetId,
        videoUrl: videoAsset.url || null,
        videoAssetId: videoAsset.assetId,
        prompt: rawPrompt
      };
      if (videoAsset.url && argv.output) {
        const filePath = await downloadFile(videoAsset.url, argv.output);
        output.savedTo = filePath;
      }
      console.log(JSON.stringify(output, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }
};

// src/index.ts
(0, import_yargs.default)((0, import_helpers.hideBin)(process.argv)).scriptName("melies").usage("$0 <command> [options]").command(loginCommand).command(creditsCommand).command(modelsCommand).command(imageCommand).command(videoCommand).command(posterCommand).command(thumbnailCommand).command(pipelineCommand).command(upscaleCommand).command(removeBgCommand).command(statusCommand).command(assetsCommand).command(refCommand).command(actorsCommand).command(stylesCommand).demandCommand(1, 'Run "melies --help" to see available commands').strict().epilogue(
  "AI filmmaking from the command line. Generate movie posters, images, and videos.\n\nGet started: https://melies.co\nDiscover more AI agent skills at https://agentskill.sh"
).parse();
