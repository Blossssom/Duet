import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, type ChildProcess } from 'node:child_process';
import type { AgentType, StreamChunk } from '@duet/shared';
import type { CliOptions } from './interfaces/cli-options.interface';

const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

@Injectable()
export class CliService {
  private readonly logger = new Logger(CliService.name);

  constructor(private readonly configService: ConfigService) {}

  async *execute(
    agent: AgentType,
    prompt: string,
    options?: CliOptions,
  ): AsyncGenerator<StreamChunk> {
    const command = this.getCommand(agent);
    const cwd =
      options?.cwd ?? this.configService.get<string>('cli.workspaceDir');
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

    this.logger.debug(`Executing ${agent} CLI: ${command}`);
    this.logger.debug(`Working directory: ${cwd}`);
    this.logger.debug(`Timeout: ${timeout}ms`);

    const childProcess = spawn(command, [prompt], {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    yield* this.streamProcess(childProcess, agent, timeout);
  }

  private async *streamProcess(
    childProcess: ChildProcess,
    agent: AgentType,
    timeout: number,
  ): AsyncGenerator<StreamChunk> {
    const { stdout, stderr } = childProcess;
    if (!stdout || !stderr) {
      throw new Error('Process streams not available');
    }

    const chunks: StreamChunk[] = [];
    let resolveNext: ((chunk: StreamChunk | null) => void) | null = null;
    let done = false;
    let exitCode: number | null = null;
    let timedOut = false;

    const pushChunk = (chunk: StreamChunk) => {
      if (resolveNext) {
        resolveNext(chunk);
        resolveNext = null;
      } else {
        chunks.push(chunk);
      }
    };

    const finish = () => {
      done = true;
      if (resolveNext) {
        resolveNext(null);
        resolveNext = null;
      }
    };

    // Setup timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      this.logger.error(`${agent} process timed out after ${timeout}ms`);
      pushChunk({
        source: agent,
        content: `Process timed out after ${timeout}ms`,
        timestamp: Date.now(),
        type: 'error',
      });
      childProcess.kill('SIGTERM');
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!done) {
          this.logger.warn(`Force killing ${agent} process`);
          childProcess.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    stdout.on('data', (data: Buffer) => {
      pushChunk({
        source: agent,
        content: data.toString(),
        timestamp: Date.now(),
        type: 'text',
      });
    });

    stderr.on('data', (data: Buffer) => {
      this.logger.warn(`${agent} stderr: ${data.toString()}`);
      pushChunk({
        source: agent,
        content: data.toString(),
        timestamp: Date.now(),
        type: 'error',
      });
    });

    childProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      exitCode = code;
      this.logger.debug(`${agent} process exited with code ${code}`);

      if (code !== 0 && code !== null && !timedOut) {
        this.logger.error(`${agent} process failed with exit code ${code}`);
        pushChunk({
          source: agent,
          content: `Process exited with code ${code}`,
          timestamp: Date.now(),
          type: 'error',
        });
      }
      finish();
    });

    childProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      this.logger.error(`${agent} spawn error: ${err.message}`);
      pushChunk({
        source: agent,
        content: `Spawn error: ${err.message}`,
        timestamp: Date.now(),
        type: 'error',
      });
      finish();
    });

    while (!done || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
      } else if (!done) {
        const chunk = await new Promise<StreamChunk | null>((resolve) => {
          resolveNext = resolve;
        });
        if (chunk) {
          yield chunk;
        }
      }
    }

    // Throw if process failed (allows caller to handle)
    if (exitCode !== 0 && exitCode !== null) {
      throw new Error(
        `${agent} process failed with exit code ${String(exitCode)}${timedOut ? ' (timed out)' : ''}`,
      );
    }
  }

  private getCommand(agent: AgentType): string {
    return agent === 'gemini'
      ? this.configService.get<string>('cli.gemini', 'gemini')
      : this.configService.get<string>('cli.claude', 'claude');
  }
}
