import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import * as childProcess from 'node:child_process';

jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
}));

describe('HealthService', () => {
  let service: HealthService;
  let configService: ConfigService;
  const mockedExecSync = childProcess.execSync as jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    configService = module.get<ConfigService>(ConfigService);
    mockedExecSync.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log success when both CLIs are available', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''));
      const logSpy = jest.spyOn(service['logger'], 'log');

      service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini CLI found'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude CLI found'),
      );
    });

    it('should warn when gemini CLI is not found', () => {
      mockedExecSync
        .mockImplementationOnce(() => {
          throw new Error('not found');
        })
        .mockReturnValueOnce(Buffer.from(''));
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini CLI "gemini" not found'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('degraded mode'),
      );
    });

    it('should warn when claude CLI is not found', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from(''))
        .mockImplementationOnce(() => {
          throw new Error('not found');
        });
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude CLI "claude" not found'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('degraded mode'),
      );
    });

    it('should warn when both CLIs are not found', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found');
      });
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini CLI "gemini" not found'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude CLI "claude" not found'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('degraded mode'),
      );
    });
  });

  describe('check', () => {
    it('should return ok when both CLIs are available', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''));

      const result = service.check();

      expect(result.status).toBe('ok');
      expect(result.cli.gemini).toBe(true);
      expect(result.cli.claude).toBe(true);
    });

    it('should return degraded when gemini CLI is not available', () => {
      mockedExecSync
        .mockImplementationOnce(() => {
          throw new Error('not found');
        })
        .mockReturnValueOnce(Buffer.from(''));

      const result = service.check();

      expect(result.status).toBe('degraded');
      expect(result.cli.gemini).toBe(false);
      expect(result.cli.claude).toBe(true);
    });

    it('should return degraded when claude CLI is not available', () => {
      mockedExecSync
        .mockReturnValueOnce(Buffer.from(''))
        .mockImplementationOnce(() => {
          throw new Error('not found');
        });

      const result = service.check();

      expect(result.status).toBe('degraded');
      expect(result.cli.gemini).toBe(true);
      expect(result.cli.claude).toBe(false);
    });

    it('should return degraded when both CLIs are not available', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = service.check();

      expect(result.status).toBe('degraded');
      expect(result.cli.gemini).toBe(false);
      expect(result.cli.claude).toBe(false);
    });

    it('should use configured CLI command names', () => {
      (configService.get as jest.Mock).mockImplementation(
        (key: string, defaultValue: string) => {
          if (key === 'cli.gemini') return 'custom-gemini';
          if (key === 'cli.claude') return 'custom-claude';
          return defaultValue;
        },
      );
      mockedExecSync.mockReturnValue(Buffer.from(''));

      service.check();

      expect(mockedExecSync).toHaveBeenCalledWith('which custom-gemini', {
        stdio: 'ignore',
      });
      expect(mockedExecSync).toHaveBeenCalledWith('which custom-claude', {
        stdio: 'ignore',
      });
    });
  });
});
