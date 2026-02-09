import { parseCodeBlocks, extractFirstCode } from './code-parser.util';

describe('parseCodeBlocks', () => {
  it('should parse a single code block with language', () => {
    const input = '```ts\nconst x = 1;\n```';
    expect(parseCodeBlocks(input)).toEqual([
      { language: 'ts', code: 'const x = 1;' },
    ]);
  });

  it('should parse a code block without language', () => {
    const input = '```\nhello\n```';
    expect(parseCodeBlocks(input)).toEqual([{ language: '', code: 'hello' }]);
  });

  it('should return empty array for text without code blocks', () => {
    expect(parseCodeBlocks('no code here')).toEqual([]);
  });

  it('should parse multiple code blocks', () => {
    const input = '```js\nfoo()\n```\nsome text\n```python\nbar()\n```';
    expect(parseCodeBlocks(input)).toEqual([
      { language: 'js', code: 'foo()' },
      { language: 'python', code: 'bar()' },
    ]);
  });

  it('should handle multiline code blocks', () => {
    const input = '```ts\nline1\nline2\nline3\n```';
    expect(parseCodeBlocks(input)).toEqual([
      { language: 'ts', code: 'line1\nline2\nline3' },
    ]);
  });

  it('should return empty array for empty string', () => {
    expect(parseCodeBlocks('')).toEqual([]);
  });
});

describe('extractFirstCode', () => {
  it('should return the first code block content', () => {
    const input = '```ts\nfirst\n```\n```js\nsecond\n```';
    expect(extractFirstCode(input)).toBe('first');
  });

  it('should return null when no code blocks exist', () => {
    expect(extractFirstCode('no code')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractFirstCode('')).toBeNull();
  });
});
