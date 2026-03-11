export function estimateReadingTime(text: string, wordsPerMinute = 225): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Calculate reading time from markdown content.
 * Strips markdown syntax (headings, formatting, code blocks, etc.) before calculating.
 */
export function calculateReadingTimeFromMarkdown(markdown: string, wordsPerMinute = 225): number {
  if (!markdown) return 1;

  // Remove code blocks
  let cleaned = markdown.replace(/```[\s\S]*?```/g, "");

  // Remove inline code
  cleaned = cleaned.replace(/`[^`]*`/g, "");

  // Remove images
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Replace links with just their text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // Remove heading markers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove bold/italic markers
  cleaned = cleaned.replace(/(\*\*\*|___)(.+?)\1/g, "$2");
  cleaned = cleaned.replace(/(\*\*|__)(.+?)\1/g, "$2");
  cleaned = cleaned.replace(/(\*|_)(.+?)\1/g, "$2");

  // Remove blockquotes
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");

  // Remove list markers
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return estimateReadingTime(cleaned, wordsPerMinute);
}
