export function removePrefixSpaceInsensitive(fullText: string, prefix: string) {
  // Normalize both fullText and prefix by removing extra spaces
  const normalize = (str: string) => str.replace(/[\n\r\t\s]+/g, " ").trim();

  const normalizedFullText = normalize(fullText);
  const normalizedPrefix = normalize(prefix);

  // Check if the normalized prefix is at the start of the normalized full text
  if (normalizedFullText.startsWith(normalizedPrefix)) {
    // Find the position of the end of the prefix in the original full text
    let prefixIndex = 0;
    let fullTextIndex = 0;

    while (prefixIndex < normalizedPrefix.length && fullTextIndex < fullText.length) {
      if (normalizedPrefix[prefixIndex].trim() === "") {
        // Skip spaces in the normalized prefix
        while (fullText[fullTextIndex].trim() === "") {
          fullTextIndex++;
        }
        prefixIndex++;
      } else if (normalizedPrefix[prefixIndex] === fullText[fullTextIndex]) {
        prefixIndex++;
        fullTextIndex++;
      } else {
        break;
      }
    }

    // Return the remaining part of the full text
    return fullText.slice(fullTextIndex);
  }

  // If the prefix is not found, return the original full text
  return fullText;
}
