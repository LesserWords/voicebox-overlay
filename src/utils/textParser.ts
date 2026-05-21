/**
 * Cleans raw clipboard text by removing Markdown patterns, URLs,
 * and normalizing whitespace/newlines.
 */
export function cleanText(raw: string): string {
  if (!raw) return "";

  let cleaned = raw;

  // 1. Remove Markdown links: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 2. Remove raw URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s$.?#].[^\s]*/g, "");

  // 3. Remove inline code backticks: `code` -> code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 4. Remove list markers at start of lines: * item, - item, 1. item -> item
  cleaned = cleaned.replace(/^[ \t]*[*+-]\s+/gm, "");
  cleaned = cleaned.replace(/^[ \t]*\d+\.\s+/gm, "");

  // 5. Replace multiple newlines/carriage returns with a single space to allow smooth reading flow
  cleaned = cleaned.replace(/[\r\n]+/g, " ");

  // 6. Replace multiple spaces with a single space
  cleaned = cleaned.replace(/\s+/g, " ");

  return cleaned.trim();
}

/**
 * Splits cleaned text into sentence chunks for natural text-to-speech pauses.
 * Avoids splitting on common abbreviations and decimal numbers.
 */
export function splitIntoChunks(text: string): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  // Common English abbreviations that shouldn't end a sentence
  const abbreviations = [
    "e\\.g", "i\\.e", "dr", "mr", "mrs", "ms", "jr", "sr",
    "vs", "approx", "etc", "prof", "al", "co", "corp", "inc",
    "ave", "st", "rd", "gen", "col", "apt", "jan", "feb", "mar",
    "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
  ];

  // Create a regex to match sentence boundary punctuation (. ! ?) followed by whitespace,
  // making sure it is not preceded by any of the abbreviations (case-insensitive) or a single letter (initials),
  // and not followed by a lowercase letter (which would imply it's mid-sentence).
  // Also avoids splitting inside decimal numbers (e.g., 3.14).
  
  // Since JavaScript regular expressions don't support full lookbehinds easily in all engines,
  // we can use a splitting helper or a custom parsing loop for extreme precision.
  // A custom tokenizer is much more robust than a single complex regex.
  
  const chunks: string[] = [];
  let currentChunk = "";
  
  // We tokenize the text by spaces
  const words = cleaned.split(" ");
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    currentChunk += (currentChunk ? " " : "") + word;

    // Check if the current word ends with a sentence terminator (. ! ?)
    const match = word.match(/([.!?]+)(["']?)$/);
    if (match) {
      // Check if it's a decimal number (like "3.14" or "1.0")
      const isDecimal = /^\d+[.!?]+\d*$/.test(word);
      
      // Check if the base word (without punctuation) is an abbreviation
      const baseWord = word.replace(/[.!?'"()]/g, "").toLowerCase();
      const isAbbreviation = abbreviations.includes(baseWord);
      
      // Check if it's a single letter initial (like "J. F. Kennedy")
      const isInitial = baseWord.length === 1;

      // If it looks like a genuine sentence ending
      if (!isDecimal && !isAbbreviation && !isInitial) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
    }
  }

  // Push any remaining text
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
