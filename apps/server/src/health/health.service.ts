import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'node:child_process';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  cli: {
    gemini: boolean;
    claude: boolean;
  };
}

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const geminiCmd = this.configService.get<string>('cli.gemini', 'gemini');
    const claudeCmd = this.configService.get<string>('cli.claude', 'claude');

    const geminiAvailable = this.isCliAvailable(geminiCmd);
    const claudeAvailable = this.isCliAvailable(claudeCmd);

    if (geminiAvailable) {
      this.logger.log(`Gemini CLI found: ${geminiCmd}`);
    } else {
      this.logger.warn(
        `Gemini CLI "${geminiCmd}" not found. ` +
          `Install it or set GEMINI_CLI env variable to the correct path.`,
      );
    }

    if (claudeAvailable) {
      this.logger.log(`Claude CLI found: ${claudeCmd}`);
    } else {
      this.logger.warn(
        `Claude CLI "${claudeCmd}" not found. ` +
          `Install it or set CLAUDE_CLI env variable to the correct path.`,
      );
    }

    if (!geminiAvailable || !claudeAvailable) {
      this.logger.warn(
        'Server starting in degraded mode. Some features will not work.',
      );
    }
  }

  check(): HealthStatus {
    const geminiAvailable = this.isCliAvailable(
      this.configService.get<string>('cli.gemini', 'gemini'),
    );
    const claudeAvailable = this.isCliAvailable(
      this.configService.get<string>('cli.claude', 'claude'),
    );

    const status = geminiAvailable && claudeAvailable ? 'ok' : 'degraded';

    return {
      status,
      cli: {
        gemini: geminiAvailable,
        claude: claudeAvailable,
      },
    };
  }

  private isCliAvailable(command: string): boolean {
    try {
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      this.logger.warn(`CLI not found: ${command}`);
      return false;
    }
  }
}
