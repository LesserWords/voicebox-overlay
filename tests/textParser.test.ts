import { describe, it, expect } from "vitest";
import { cleanText, splitIntoChunks } from "../src/utils/textParser";

describe("textParser - cleanText", () => {
  it("should remove markdown link structures but keep the text", () => {
    const raw = "Check out this [great document](https://example.com/doc) for details.";
    expect(cleanText(raw)).toBe("Check out this great document for details.");
  });

  it("should strip raw HTTP and HTTPS URLs", () => {
    const raw = "Visit https://google.com or http://example.org/path?query=1 for info.";
    expect(cleanText(raw)).toBe("Visit or for info.");
  });

  it("should remove backticks around inline code", () => {
    const raw = "Use the `run_command` tool to execute shell instructions.";
    expect(cleanText(raw)).toBe("Use the run_command tool to execute shell instructions.");
  });

  it("should clean list markers at the beginning of lines", () => {
    const raw = `
* First item
- Second item
1. Third item
    `;
    expect(cleanText(raw)).toBe("First item Second item Third item");
  });

  it("should normalize multiple newlines and spaces", () => {
    const raw = "Line one.\n\nLine   two with    spaces.";
    expect(cleanText(raw)).toBe("Line one. Line two with spaces.");
  });
});

describe("textParser - splitIntoChunks", () => {
  it("should split regular sentences on periods, exclamation points, and question marks", () => {
    const raw = "Hello world! This is a test. Is this correct? Yes it is.";
    const chunks = splitIntoChunks(raw);
    expect(chunks).toEqual([
      "Hello world!",
      "This is a test.",
      "Is this correct?",
      "Yes it is."
    ]);
  });

  it("should not split on decimal numbers", () => {
    const raw = "The version is 3.14 and it is stable.";
    const chunks = splitIntoChunks(raw);
    expect(chunks).toEqual(["The version is 3.14 and it is stable."]);
  });

  it("should not split on common abbreviations", () => {
    const raw = "Dr. Smith went to the store, e.g., to buy apples, oranges, etc. before returning.";
    const chunks = splitIntoChunks(raw);
    expect(chunks).toEqual(["Dr. Smith went to the store, e.g., to buy apples, oranges, etc. before returning."]);
  });

  it("should not split on single letter initials", () => {
    const raw = "We spoke with J. F. Kennedy yesterday.";
    const chunks = splitIntoChunks(raw);
    expect(chunks).toEqual(["We spoke with J. F. Kennedy yesterday."]);
  });
});
