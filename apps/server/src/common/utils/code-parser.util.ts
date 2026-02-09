export interface CodeBlock {
  language: string;
  code: string;
}

const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g;

export function parseCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  for (const match of text.matchAll(CODE_BLOCK_REGEX)) {
    blocks.push({
      language: match[1] || '',
      code: match[2].trimEnd(),
    });
  }

  return blocks;
}

export function extractFirstCode(text: string): string | null {
  const blocks = parseCodeBlocks(text);
  return blocks.length > 0 ? blocks[0].code : null;
}
