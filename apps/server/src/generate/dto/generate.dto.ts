import type { GenerateRequest } from '@duet/shared';

export class GenerateDto implements GenerateRequest {
  prompt!: string;
  options?: {
    skipReview?: boolean;
  };
}
