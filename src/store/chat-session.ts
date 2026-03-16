// 会话持久化存储 - 飞书 chatId ↔ 会话状态映射

import * as fs from 'fs';
import * as path from 'path';

interface ChatSessionData {
  chatId: string;
  chatType: 'p2p' | 'group';
  creatorId: string;
  createdAt: number;
  lastActiveAt: number;
  title?: string;
}

const STORE_FILE = path.join(process.cwd(), '.chat-sessions.json');

class ChatSessionStore {
  private data = new Map<string, ChatSessionData>();

  constructor() { this.load(); }

  private load(): void {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const content = fs.readFileSync(STORE_FILE, 'utf-8');
        this.data = new Map(Object.entries(JSON.parse(content)));
        console.log(`[Store] 已加载 ${this.data.size} 个会话`);
      }
    } catch (error) {
      console.error('[Store] 加载数据失败:', error);
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(Object.fromEntries(this.data), null, 2));
    } catch (error) {
      console.error('[Store] 保存数据失败:', error);
    }
  }

  get(chatId: string): ChatSessionData | undefined {
    return this.data.get(chatId);
  }

  set(chatId: string, chatType: 'p2p' | 'group', creatorId: string, title?: string): void {
    const existing = this.data.get(chatId);
    this.data.set(chatId, {
      chatId,
      chatType,
      creatorId,
      createdAt: existing?.createdAt ?? Date.now(),
      lastActiveAt: Date.now(),
      title,
    });
    this.save();
  }

  touch(chatId: string): void {
    const session = this.data.get(chatId);
    if (session) {
      session.lastActiveAt = Date.now();
      this.save();
    }
  }

  remove(chatId: string): void {
    this.data.delete(chatId);
    this.save();
  }

  getAllChatIds(): string[] {
    return Array.from(this.data.keys());
  }
}

export const chatSessionStore = new ChatSessionStore();
