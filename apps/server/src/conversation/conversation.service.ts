import { Injectable, Logger } from '@nestjs/common';
import type { AgentType, CodeBlock } from '@duet/shared';
import { randomUUID } from 'crypto';
import { MessageEntity } from './entities/message.entity';
import { ConversationEntity } from './entities/conversation.entity';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly conversations = new Map<string, ConversationEntity>();

  createConversation(): ConversationEntity {
    const conversation = new ConversationEntity(randomUUID());
    this.conversations.set(conversation.id, conversation);
    this.logger.debug(`Created conversation ${conversation.id}`);
    return conversation;
  }

  addMessage(
    conversationId: string,
    role: 'user' | AgentType,
    content: string,
    codeBlocks?: CodeBlock[],
  ): MessageEntity {
    const conversation = this.getConversation(conversationId);
    const message = new MessageEntity({
      id: randomUUID(),
      role,
      content,
      codeBlocks,
    });
    conversation.messages.push(message);
    this.logger.debug(
      `Added ${role} message to conversation ${conversationId}`,
    );
    return message;
  }

  getMessages(conversationId: string): MessageEntity[] {
    return this.getConversation(conversationId).messages;
  }

  getAllConversations(): ConversationEntity[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }

  clearMessages(conversationId: string): void {
    const conversation = this.getConversation(conversationId);
    conversation.messages.length = 0;
    this.logger.debug(`Cleared messages for conversation ${conversationId}`);
  }

  private getConversation(id: string): ConversationEntity {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation ${id} not found`);
    }
    return conversation;
  }
}
