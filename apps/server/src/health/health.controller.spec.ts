import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status from service', () => {
      const mockStatus = {
        status: 'ok' as const,
        cli: { gemini: true, claude: true },
      };
      (healthService.check as jest.Mock).mockReturnValue(mockStatus);

      const result = controller.check();

      expect(result).toEqual(mockStatus);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(healthService.check).toHaveBeenCalled();
    });

    it('should return degraded status when CLIs unavailable', () => {
      const mockStatus = {
        status: 'degraded' as const,
        cli: { gemini: false, claude: false },
      };
      (healthService.check as jest.Mock).mockReturnValue(mockStatus);

      const result = controller.check();

      expect(result).toEqual(mockStatus);
    });
  });
});
