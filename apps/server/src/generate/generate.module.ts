import { Module } from '@nestjs/common';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import { CliModule } from '../cli/cli.module';

@Module({
  imports: [CliModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
