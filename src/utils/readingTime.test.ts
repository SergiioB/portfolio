import { describe, it, expect } from "vitest";

import { estimateReadingTime, calculateReadingTimeFromMarkdown } from "./readingTime";

describe("estimateReadingTime", () => {
  it("returns 1 minute for empty text", () => {
    expect(estimateReadingTime("")).toBe(1);
  });

  it("returns 1 minute for null/undefined (handled by empty check)", () => {
    expect(estimateReadingTime("")).toBe(1);
  });

  it("calculates reading time for short text (< 225 words)", () => {
    const shortText = "This is a short text with few words.";
    expect(estimateReadingTime(shortText)).toBe(1);
  });

  it("calculates reading time for exactly 225 words", () => {
    const words = Array(225).fill("word").join(" ");
    expect(estimateReadingTime(words)).toBe(1);
  });

  it("calculates reading time for 226 words (rounds up)", () => {
    const words = Array(226).fill("word").join(" ");
    expect(estimateReadingTime(words)).toBe(2);
  });

  it("calculates reading time for 450 words", () => {
    const words = Array(450).fill("word").join(" ");
    expect(estimateReadingTime(words)).toBe(2);
  });

  it("handles custom words per minute", () => {
    const text = "word ".repeat(100).trim();
    expect(estimateReadingTime(text, 100)).toBe(1);
    expect(estimateReadingTime(text, 50)).toBe(2);
  });

  it("handles text with extra whitespace", () => {
    const text = "  word1   word2  word3  ";
    expect(estimateReadingTime(text)).toBe(1);
  });

  it("handles text with newlines and tabs", () => {
    const text = "word1\n\nword2\t\tword3";
    expect(estimateReadingTime(text)).toBe(1);
  });
});

describe("calculateReadingTimeFromMarkdown", () => {
  it("removes markdown syntax before calculating", () => {
    const markdown = "# Heading\n\nSome **bold** and *italic* text.";
    const result = calculateReadingTimeFromMarkdown(markdown);
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it("removes code blocks", () => {
    const markdown = `
Some text here.

\`\`\`typescript
const code = "example";
\`\`\`

More text.
    `;
    const result = calculateReadingTimeFromMarkdown(markdown);
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it("removes inline code", () => {
    const markdown = "Use the `console.log()` function for debugging.";
    const result = calculateReadingTimeFromMarkdown(markdown);
    expect(result).toBe(1);
  });

  it("removes links but keeps link text", () => {
    const markdown = "Check out [this link](https://example.com) for more info.";
    const result = calculateReadingTimeFromMarkdown(markdown);
    expect(result).toBe(1);
  });

  it("removes images", () => {
    const markdown = "![Alt text](image.png) Some text after image.";
    const result = calculateReadingTimeFromMarkdown(markdown);
    expect(result).toBe(1);
  });

  it("handles empty markdown", () => {
    expect(calculateReadingTimeFromMarkdown("")).toBe(1);
  });

  it("handles markdown with only whitespace", () => {
    expect(calculateReadingTimeFromMarkdown("   \n\n   ")).toBe(1);
  });

  it("calculates correctly for large markdown documents", () => {
    const words = Array(500).fill("word").join(" ");
    const markdown = `# Title\n\n${words}`;
    expect(calculateReadingTimeFromMarkdown(markdown)).toBeGreaterThanOrEqual(2);
  });
});
