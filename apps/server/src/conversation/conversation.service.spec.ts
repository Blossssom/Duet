import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationService],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create a conversation with unique id', () => {
      const conversation = service.createConversation();

      expect(conversation.id).toBeDefined();
      expect(conversation.messages).toEqual([]);
      expect(conversation.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should create multiple conversations with different ids', () => {
      const c1 = service.createConversation();
      const c2 = service.createConversation();

      expect(c1.id).not.toBe(c2.id);
    });
  });

  describe('addMessage', () => {
    it('should add a user message to conversation', () => {
      const conversation = service.createConversation();
      const message = service.addMessage(
        conversation.id,
        'user',
        'Hello world',
      );

      expect(message.id).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello world');
      expect(message.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should add an agent message to conversation', () => {
      const conversation = service.createConversation();
      const message = service.addMessage(
        conversation.id,
        'gemini',
        'Generated code',
      );

      expect(message.role).toBe('gemini');
      expect(message.content).toBe('Generated code');
    });

    it('should add a message with code blocks', () => {
      const conversation = service.createConversation();
      const codeBlocks = [{ language: 'ts', code: 'const x = 1;' }];
      const message = service.addMessage(
        conversation.id,
        'gemini',
        'Here is code',
        codeBlocks,
      );

      expect(message.codeBlocks).toEqual(codeBlocks);
    });

    it('should throw when conversation does not exist', () => {
      expect(() => service.addMessage('nonexistent', 'user', 'test')).toThrow(
        'Conversation nonexistent not found',
      );
    });
  });

  describe('getMessages', () => {
    it('should return empty array for new conversation', () => {
      const conversation = service.createConversation();
      const messages = service.getMessages(conversation.id);

      expect(messages).toEqual([]);
    });

    it('should return all messages in order', () => {
      const conversation = service.createConversation();
      service.addMessage(conversation.id, 'user', 'prompt');
      service.addMessage(conversation.id, 'gemini', 'response');
      service.addMessage(conversation.id, 'claude', 'review');

      const messages = service.getMessages(conversation.id);

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('gemini');
      expect(messages[2].role).toBe('claude');
    });

    it('should throw when conversation does not exist', () => {
      expect(() => service.getMessages('nonexistent')).toThrow(
        'Conversation nonexistent not found',
      );
    });
  });

  describe('clearMessages', () => {
    it('should remove all messages from conversation', () => {
      const conversation = service.createConversation();
      service.addMessage(conversation.id, 'user', 'prompt');
      service.addMessage(conversation.id, 'gemini', 'response');

      service.clearMessages(conversation.id);

      const messages = service.getMessages(conversation.id);
      expect(messages).toHaveLength(0);
    });

    it('should not affect other conversations', () => {
      const c1 = service.createConversation();
      const c2 = service.createConversation();
      service.addMessage(c1.id, 'user', 'msg1');
      service.addMessage(c2.id, 'user', 'msg2');

      service.clearMessages(c1.id);

      expect(service.getMessages(c1.id)).toHaveLength(0);
      expect(service.getMessages(c2.id)).toHaveLength(1);
    });

    it('should throw when conversation does not exist', () => {
      expect(() => service.clearMessages('nonexistent')).toThrow(
        'Conversation nonexistent not found',
      );
    });
  });

  describe('getAllConversations', () => {
    it('should return empty array when no conversations exist', () => {
      expect(service.getAllConversations()).toEqual([]);
    });

    it('should return all conversations sorted by newest first', () => {
      const c1 = service.createConversation();
      const c2 = service.createConversation();

      const all = service.getAllConversations();

      expect(all).toHaveLength(2);
      expect(all[0].createdAt).toBeGreaterThanOrEqual(all[1].createdAt);
    });
  });
});
