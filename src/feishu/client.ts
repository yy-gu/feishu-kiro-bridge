// 飞书 API 客户端封装 - 使用 WSClient 长连接

import * as lark from '@larksuiteoapi/node-sdk';
import { feishuConfig, outputConfig } from '../config.js';

export interface FeishuMessageEvent {
  messageId: string;
  chatId: string;
  chatType: 'p2p' | 'group';
  content: string;
  senderId: string;
  mentions?: Array<{ key: string; id: { open_id: string } }>;
}

type MessageCallback = (event: FeishuMessageEvent) => void;

class FeishuClient {
  private client: lark.Client;
  private wsClient: lark.WSClient;
  private eventDispatcher: lark.EventDispatcher;
  private messageCallback: MessageCallback | null = null;

  constructor() {
    this.client = new lark.Client({
      appId: feishuConfig.appId,
      appSecret: feishuConfig.appSecret,
    });

    this.eventDispatcher = new lark.EventDispatcher({
      encryptKey: feishuConfig.encryptKey,
      verificationToken: feishuConfig.verificationToken,
    });

    this.wsClient = new lark.WSClient({
      appId: feishuConfig.appId,
      appSecret: feishuConfig.appSecret,
    });
  }

  onMessage(callback: MessageCallback): void {
    this.messageCallback = callback;
  }

  async start(): Promise<void> {
    console.log('[飞书] 正在启动长连接...');

    this.eventDispatcher.register({
      'im.message.receive_v1': (data: any) => {
        this.handleIncomingMessage(data);
        return { msg: 'ok' };
      },
    });

    await this.wsClient.start({ eventDispatcher: this.eventDispatcher });
    console.log('[飞书] 长连接已建立');
  }

  private handleIncomingMessage(data: any): void {
    if (!this.messageCallback) return;
    try {
      const msg = data.message;
      if (!msg || msg.message_type !== 'text') return;

      this.messageCallback({
        messageId: msg.message_id,
        chatId: msg.chat_id,
        chatType: msg.chat_type as 'p2p' | 'group',
        content: msg.content,
        senderId: data.sender?.sender_id?.open_id || '',
        mentions: msg.mentions,
      });
    } catch (error) {
      console.error('[飞书] 解析消息失败:', error);
    }
  }

  async sendText(chatId: string, text: string): Promise<string | null> {
    const truncated = text.length > outputConfig.maxMessageLength
      ? text.slice(0, outputConfig.maxMessageLength) + '\n...(已截断)'
      : text;
    try {
      const resp = await this.client.im.message.create({
        data: {
          receive_id: chatId,
          msg_type: 'text',
          content: JSON.stringify({ text: truncated }),
        },
        params: { receive_id_type: 'chat_id' },
      });
      return (resp?.data?.message_id as string) ?? null;
    } catch (error) {
      console.error('[飞书] 发送消息失败:', error);
      return null;
    }
  }

  async updateText(messageId: string, text: string): Promise<boolean> {
    const truncated = text.length > outputConfig.maxMessageLength
      ? text.slice(0, outputConfig.maxMessageLength) + '\n...(已截断)'
      : text;
    try {
      await this.client.im.message.patch({
        path: { message_id: messageId },
        data: { content: JSON.stringify({ text: truncated }) },
      });
      return true;
    } catch (error) {
      console.error('[飞书] 更新消息失败:', error);
      return false;
    }
  }

  async replyText(messageId: string, text: string): Promise<string | null> {
    const truncated = text.length > outputConfig.maxMessageLength
      ? text.slice(0, outputConfig.maxMessageLength) + '\n...(已截断)'
      : text;
    try {
      const resp = await this.client.im.message.reply({
        path: { message_id: messageId },
        data: {
          msg_type: 'text',
          content: JSON.stringify({ text: truncated }),
        },
      });
      return (resp?.data?.message_id as string) ?? null;
    } catch (error) {
      console.error('[飞书] 回复消息失败:', error);
      return null;
    }
  }
}

export const feishuClient = new FeishuClient();
