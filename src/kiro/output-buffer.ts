// 输出缓冲区 - 聚合 Kiro 输出后定时刷新飞书消息

import { outputConfig } from '../config.js';

interface BufferedOutput {
  key: string;
  chatId: string;
  messageId: string | null;       // 飞书消息 ID（首次发送后设置）
  replyMessageId: string | null;  // 回复的用户消息 ID
  content: string[];
  dirty: boolean;
  lastUpdate: number;
  timer: NodeJS.Timeout | null;
  status: 'running' | 'completed' | 'failed' | 'aborted';
}

type UpdateCallback = (buffer: BufferedOutput) => Promise<void>;

class OutputBuffer {
  private buffers = new Map<string, BufferedOutput>();
  private updateCallback: UpdateCallback | null = null;

  setUpdateCallback(callback: UpdateCallback): void {
    this.updateCallback = callback;
  }

  getOrCreate(key: string, chatId: string, replyMessageId: string | null): BufferedOutput {
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = {
        key,
        chatId,
        messageId: null,
        replyMessageId,
        content: [],
        dirty: false,
        lastUpdate: Date.now(),
        timer: null,
        status: 'running',
      };
      this.buffers.set(key, buffer);
    }
    return buffer;
  }

  append(key: string, text: string): void {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    buffer.content.push(text);
    buffer.dirty = true;
    this.scheduleUpdate(key);
  }

  setMessageId(key: string, messageId: string): void {
    const buffer = this.buffers.get(key);
    if (buffer) buffer.messageId = messageId;
  }

  setStatus(key: string, status: BufferedOutput['status']): void {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    buffer.status = status;
    buffer.dirty = true;
    this.triggerUpdate(key);
  }

  getText(key: string): string {
    const buffer = this.buffers.get(key);
    if (!buffer) return '';
    return buffer.content.join('');
  }

  private scheduleUpdate(key: string): void {
    const buffer = this.buffers.get(key);
    if (!buffer || buffer.timer) return;
    buffer.timer = setTimeout(() => {
      this.triggerUpdate(key);
    }, outputConfig.updateInterval);
  }

  private async triggerUpdate(key: string): Promise<void> {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
    }
    buffer.lastUpdate = Date.now();
    if (this.updateCallback && buffer.dirty) {
      buffer.dirty = false;
      try {
        await this.updateCallback(buffer);
      } catch (error) {
        console.error(`[OutputBuffer] 更新失败:`, error);
        buffer.dirty = true;
      }
    }
  }

  clear(key: string): void {
    const buffer = this.buffers.get(key);
    if (buffer?.timer) clearTimeout(buffer.timer);
    this.buffers.delete(key);
  }

  abort(key: string): void {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
    }
    buffer.status = 'aborted';
    this.triggerUpdate(key);
  }

  clearAll(): void {
    for (const buffer of this.buffers.values()) {
      if (buffer.timer) clearTimeout(buffer.timer);
    }
    this.buffers.clear();
  }
}

export const outputBuffer = new OutputBuffer();
