var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/video-size.ts
import { spawn, spawnSync } from "child_process";

// src/regex-trie.ts
var RegexTrie = class {
  static {
    __name(this, "RegexTrie");
  }
  constructor() {
    this.count = 0;
    this.trie = {};
  }
  add(value) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        this.add(value[i]);
      }
      return this;
    }
    const input = this.castToString(value);
    if (!this.isNonEmptyString(input)) {
      return this;
    }
    if (this.contains(input)) {
      return this;
    }
    let trie = this.trie;
    for (let i = 0; i < input.length; i++) {
      const chr = input[i];
      const node = this.find(trie, chr);
      if (node) {
        trie = node;
        continue;
      }
      trie[chr] = {};
      const created_node = this.find(trie, chr);
      if (created_node) {
        trie = created_node;
      }
    }
    trie.end = true;
    this.count++;
    return this;
  }
  toRegExp() {
    if (this.count === 0) {
      return void 0;
    }
    return new RegExp(this.walk(this.trie));
  }
  stringify() {
    if (this.count === 0) {
      return void 0;
    }
    return this.walk(this.trie);
  }
  source(altGroup, charClass, end) {
    let result = "";
    if (altGroup.length > 0) {
      if (altGroup.length === 1) {
        result += altGroup[0];
      } else {
        let all_single_char = true;
        for (let i = 0; i < altGroup.length; i++) {
          if (altGroup[i].length !== 1) {
            all_single_char = false;
            break;
          }
        }
        if (all_single_char) {
          result += `[${altGroup.join("")}]`;
        } else {
          result += `(?:${altGroup.join("|")})`;
        }
      }
    } else if (charClass.length > 0) {
      result += charClass[0];
    }
    if (end && result) {
      if (result.length === 1) {
        result += "?";
      } else {
        result = `(?:${result})?`;
      }
    }
    return result;
  }
  contains(value) {
    const input = this.castToString(value);
    if (!this.isNonEmptyString(input)) {
      return false;
    }
    let trie = this.trie;
    for (let i = 0; i < input.length; i++) {
      const chr = input[i];
      const node = this.find(trie, chr);
      if (!node) {
        return false;
      }
      trie = node;
    }
    return hasOwnProperty.call(trie, "end") && trie.end === true;
  }
  castToString(value) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return String(value);
    }
    return value;
  }
  isNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
  }
  escapeRegex(input) {
    return input.replace(/([\t\n\f\r\\\$\(\)\*\+\-\.\?\[\]\^\{\|\}])/g, "\\$1").replace(/[^\x20-\x7E]/g, JSON.stringify);
  }
  find(trie, key) {
    const node = trie?.[key];
    if (!node || node === true) {
      return void 0;
    }
    return node;
  }
  walk(trie) {
    const keys = Object.keys(trie);
    const altGroup = [];
    const charClass = [];
    let end = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "end") {
        end = true;
        continue;
      }
      const node = this.find(trie, key);
      if (!node) {
        continue;
      }
      const walkResult = `${this.escapeRegex(key)}${this.walk(node)}`;
      const target = keys.length > 1 ? altGroup : charClass;
      target.push(walkResult);
    }
    return this.source(altGroup, charClass, end);
  }
};
var regexps = /* @__PURE__ */ new WeakMap();
function createExtRegex(patterns) {
  if (regexps.has(patterns)) {
    return regexps.get(patterns);
  }
  const trie = new RegexTrie();
  trie.add([...patterns]);
  const regex = new RegExp(`\\.${trie.stringify()}$`, "i");
  regexps.set(patterns, regex);
  return regex;
}
__name(createExtRegex, "createExtRegex");

// src/video-size.ts
var VIDEO_EXTS = /* @__PURE__ */ new Set([
  "264",
  "265",
  "3g2",
  "3gp",
  "apng",
  "asf",
  "avi",
  "avs",
  "avs2",
  "avs3",
  "cavs",
  "dnxhd",
  "dnxhr",
  "drc",
  "dv",
  "evc",
  "f4v",
  "flv",
  "gif",
  "h261",
  "h263",
  "h264",
  "h265",
  "hevc",
  "ism",
  "ismv",
  "ivf",
  "kux",
  "m1v",
  "m2t",
  "m2ts",
  "m2v",
  "m4v",
  "mj2",
  "mjpeg",
  "mjpg",
  "mk3d",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "mts",
  "mxf",
  "nut",
  "obu",
  "ogg",
  "ogv",
  "psp",
  "ts",
  "vc1",
  "vc2",
  "vob",
  "webm",
  "wmv"
]);
var videoRegex = createExtRegex([...VIDEO_EXTS]);
var isVideoFile = /* @__PURE__ */ __name((filepath) => videoRegex.test(filepath), "isVideoFile");
var defaultArgs = [
  "-v",
  "error",
  "-select_streams",
  "v:0",
  "-show_entries",
  "stream=width,height:stream_tags=rotate:stream_side_data=rotation",
  "-of",
  "json"
];
function normalizeRotation(rotation) {
  if (!Number.isFinite(rotation)) {
    return null;
  }
  const normalized = (rotation % 360 + 360) % 360;
  const quarterTurns = Math.round(normalized / 90) % 4;
  if (Math.abs(normalized - quarterTurns * 90) > 1e-4) {
    return null;
  }
  return quarterTurns * 90;
}
__name(normalizeRotation, "normalizeRotation");
function parseRotation(stream) {
  const sideDataRotation = stream.side_data_list?.find((sideData) => sideData.rotation != null)?.rotation;
  if (sideDataRotation != null) {
    const rotation = Number(sideDataRotation);
    if (!Number.isNaN(rotation)) {
      return normalizeRotation(rotation);
    }
  }
  const taggedRotation = stream.tags?.rotate;
  if (taggedRotation != null) {
    const rotation = Number(taggedRotation);
    if (!Number.isNaN(rotation)) {
      return normalizeRotation(rotation);
    }
  }
  return null;
}
__name(parseRotation, "parseRotation");
function extractOrientation(stream, width, height) {
  const rotation = parseRotation(stream) ?? 0;
  const rotated = rotation === 90 || rotation === 270;
  const displayWidth = rotated ? height : width;
  const displayHeight = rotated ? width : height;
  if (displayWidth === displayHeight) {
    return null;
  }
  return displayWidth > displayHeight ? "landscape" : "portrait";
}
__name(extractOrientation, "extractOrientation");
function extractDimensions(output) {
  const parsed = JSON.parse(output);
  const stream = parsed.streams?.[0];
  const width = Number(stream?.width);
  const height = Number(stream?.height);
  if (!stream || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Unable to extract video dimensions from ffprobe output: ${output}`);
  }
  return {
    width,
    height,
    orientation: extractOrientation(stream, width, height)
  };
}
__name(extractDimensions, "extractDimensions");
function videoSizeSync(filepath) {
  const args = [...defaultArgs, filepath];
  const { error, status, stdout, stderr } = spawnSync("ffprobe", args);
  if (error) {
    throw error;
  }
  if (status !== 0) {
    throw new Error(stderr.toString());
  }
  return extractDimensions(stdout.toString());
}
__name(videoSizeSync, "videoSizeSync");
async function videoSize(filepath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [...defaultArgs, filepath]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => {
      stdout += data;
    });
    proc.stderr.on("data", (data) => {
      stderr += data;
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr));
        return;
      }
      try {
        resolve(extractDimensions(stdout));
      } catch (err) {
        reject(err);
      }
    });
    proc.on("error", reject);
  });
}
__name(videoSize, "videoSize");
videoSize.isVideoFile = isVideoFile;
videoSize.sync = videoSizeSync;
var sync = videoSizeSync;
export {
  VIDEO_EXTS,
  extractDimensions,
  extractOrientation,
  isVideoFile,
  normalizeRotation,
  parseRotation,
  sync,
  videoRegex,
  videoSize,
  videoSizeSync
};
//# sourceMappingURL=index.mjs.map