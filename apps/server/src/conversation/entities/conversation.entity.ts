import { MessageEntity } from './message.entity';

export class ConversationEntity {
  readonly id: string;
  readonly messages: MessageEntity[] = [];
  readonly createdAt: number;

  constructor(id: string) {
    this.id = id;
    this.createdAt = Date.now();
  }
}
