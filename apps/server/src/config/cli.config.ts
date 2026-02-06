import { registerAs } from '@nestjs/config';

export default registerAs('cli', () => ({
  gemini: process.env.GEMINI_CLI ?? 'gemini',
  claude: process.env.CLAUDE_CLI ?? 'claude',
}));
