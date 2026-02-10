import { Injectable, Logger } from '@nestjs/common';
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
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly configService: ConfigService) {}

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
