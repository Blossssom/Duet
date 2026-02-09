import { Module } from '@nestjs/common';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import { CliModule } from '../cli/cli.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [CliModule, ConversationModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
