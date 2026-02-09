import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('api/history')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  getAll() {
    this.logger.debug('Fetching all conversations');
    return this.conversationService.getAllConversations();
  }

  @Get(':id')
  getMessages(@Param('id') id: string) {
    try {
      return this.conversationService.getMessages(id);
    } catch {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
  }
}
