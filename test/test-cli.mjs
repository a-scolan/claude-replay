import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "..", "bin", "claude-replay.mjs");
const FIXTURE = resolve(__dirname, "e2e", "fixture.jsonl");

function run(args, timeout = 5000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error("CLI timed out — may have launched server")), timeout);
    execFile(process.execPath, [CLI, ...args], (err, stdout, stderr) => {
      clearTimeout(timer);
      res({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

describe("CLI flags", () => {
  it("--version prints version and exits", async () => {
    const { code, stdout } = await run(["--version"]);
    assert.equal(code, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("-v prints version and exits", async () => {
    const { code, stdout } = await run(["-v"]);
    assert.equal(code, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("--list-themes prints themes and exits", async () => {
    const { code, stdout } = await run(["--list-themes"]);
    assert.equal(code, 0);
    const lines = stdout.trim().split("\n");
    assert.ok(lines.length >= 3);
    assert.ok(lines.includes("tokyo-night"));
    assert.ok(lines.includes("dracula"));
  });

  it("--help prints usage and exits", async () => {
    const { code, stdout } = await run(["--help"]);
    assert.equal(code, 0);
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /--list-themes/);
  });

  it("-h prints usage and exits", async () => {
    const { code, stdout } = await run(["-h"]);
    assert.equal(code, 0);
    assert.match(stdout, /Usage:/);
  });

  it("extract without file shows error", async () => {
    const { code, stderr } = await run(["extract"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /input file is required/);
  });

  it("nonexistent file shows error", async () => {
    const { code, stderr } = await run(["nonexistent-file.jsonl"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /file not found/);
  });

  it("generates HTML to stdout with fixture input", async () => {
    const { code, stdout } = await run([FIXTURE]);
    assert.equal(code, 0);
    assert.match(stdout, /<!DOCTYPE html>/);
  });
});
