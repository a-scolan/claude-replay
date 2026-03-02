import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTranscript, filterTurns } from "../src/parser.mjs";

const FIXTURE = new URL("./fixture.jsonl", import.meta.url).pathname;

describe("parseTranscript", () => {
  // Fixture produces 4 turns:
  //   1: user "Hello" → thinking + text
  //   2: user "use a tool" → tool_use (with result attached)
  //   3: (continuation) → text "The file contains..."
  //   4: user "Thanks!" → text "You're welcome!"
  it("parses turns from JSONL", () => {
    const turns = parseTranscript(FIXTURE);
    assert.equal(turns.length, 4);
  });

  it("extracts user text", () => {
    const turns = parseTranscript(FIXTURE);
    assert.equal(turns[0].user_text, "Hello, what is 2+2?");
    assert.equal(turns[3].user_text, "Thanks!");
  });

  it("creates continuation turn for assistant after tool result", () => {
    const turns = parseTranscript(FIXTURE);
    assert.equal(turns[2].user_text, "");
    const text = turns[2].blocks.filter((b) => b.kind === "text");
    assert.equal(text.length, 1);
    assert.match(text[0].text, /file contains/);
  });

  it("extracts thinking blocks", () => {
    const turns = parseTranscript(FIXTURE);
    const thinking = turns[0].blocks.filter((b) => b.kind === "thinking");
    assert.equal(thinking.length, 1);
    assert.match(thinking[0].text, /simple math/);
  });

  it("extracts text blocks", () => {
    const turns = parseTranscript(FIXTURE);
    const text = turns[0].blocks.filter((b) => b.kind === "text");
    assert.equal(text.length, 1);
    assert.equal(text[0].text, "2 + 2 = 4");
  });

  it("extracts tool calls with results", () => {
    const turns = parseTranscript(FIXTURE);
    const toolBlocks = turns[1].blocks.filter((b) => b.kind === "tool_use");
    assert.equal(toolBlocks.length, 1);
    assert.equal(toolBlocks[0].tool_call.name, "Read");
    assert.equal(toolBlocks[0].tool_call.result, "file contents here");
  });

  it("assigns sequential turn indices", () => {
    const turns = parseTranscript(FIXTURE);
    assert.deepEqual(
      turns.map((t) => t.index),
      [1, 2, 3, 4]
    );
  });

  it("preserves timestamps", () => {
    const turns = parseTranscript(FIXTURE);
    assert.equal(turns[0].timestamp, "2025-06-01T10:00:00Z");
  });
});

describe("filterTurns", () => {
  it("filters by turn range", () => {
    const turns = parseTranscript(FIXTURE);
    const filtered = filterTurns(turns, { turnRange: [2, 3] });
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].index, 2);
  });

  it("filters by time range", () => {
    const turns = parseTranscript(FIXTURE);
    const filtered = filterTurns(turns, {
      timeFrom: "2025-06-01T10:01:00Z",
      timeTo: "2025-06-01T10:01:05Z",
    });
    // Turns 2 (10:01:00) and 3 (10:01:01) fall in range
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].index, 2);
  });

  it("returns all turns with no filters", () => {
    const turns = parseTranscript(FIXTURE);
    const filtered = filterTurns(turns);
    assert.equal(filtered.length, 4);
  });
});
