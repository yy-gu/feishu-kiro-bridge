// 消息处理器 - 接收飞书消息，调用 Kiro，回复结果

import { feishuClient, type FeishuMessageEvent } from '../feishu/client.js';
import { kiroClient } from '../kiro/client.js';
import { chatSessionStore } from '../store/chat-session.js';
import { sessionQueueManager } from '../utils/session-queue.js';
import { handleSlashCommand } from './slash-commands.js';
import { userConfig, groupConfig } from '../config.js';

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function extractText(event: FeishuMessageEvent): string {
  try {
    const parsed = JSON.parse(event.content);
    let text: string = parsed.text || '';
    text = text.replace(/@_user_\d+/g, '').trim();
    return text;
  } catch {
    return '';
  }
}

function isUserAllowed(userId: string): boolean {
  if (!userConfig.isWhitelistEnabled) return true;
  return userConfig.allowedUsers.includes(userId);
}

function shouldSkipGroupMessage(event: FeishuMessageEvent): boolean {
  if (event.chatType !== 'group') return false;
  if (!groupConfig.requireMentionInGroup) return false;
  return !Array.isArray(event.mentions) || event.mentions.length === 0;
}

// 消息去重
const processedMessages = new Set<string>();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

export async function handleMessage(event: FeishuMessageEvent): Promise<void> {
  if (processedMessages.has(event.messageId)) return;
  processedMessages.add(event.messageId);

  if (!isUserAllowed(event.senderId)) {
    console.log(`[Handler] 用户 ${event.senderId} 不在白名单中，忽略`);
    return;
  }

  if (shouldSkipGroupMessage(event)) return;

  const text = extractText(event);
  if (!text) return;

  chatSessionStore.set(event.chatId, event.chatType, event.senderId);

  // 斜杠命令拦截
  if (text.startsWith('/')) {
    const reply = await handleSlashCommand(text, event.chatId);
    if (reply) {
      await feishuClient.replyText(event.messageId, reply);
      return;
    }
  }

  const queue = sessionQueueManager.getOrCreate(event.chatId);
  await queue.enqueue(() => processMessage(event.chatId, event.messageId, text));
}

async function processMessage(
  chatId: string,
  userMessageId: string,
  text: string
): Promise<void> {
  // 先回复"思考中"
  const placeholderMsgId = await feishuClient.replyText(userMessageId, '⏳ 正在思考...');

  try {
    const result = await kiroClient.ask(text, chatId);

    let finalText = stripAnsi(result.output).trim();

    if (result.timedOut) {
      finalText += '\n\n⚠️ 响应超时，已终止';
    } else if (result.exitCode !== 0 && !finalText) {
      finalText = `⚠️ 异常退出 (code: ${result.exitCode})`;
    }

    if (!finalText) finalText = '（无输出）';

    // 飞书不支持 patch 普通文本消息，直接发新回复
    await feishuClient.replyText(userMessageId, finalText);
  } catch (error) {
    console.error(`[Handler] 处理消息失败:`, error);
    const errMsg = error instanceof Error ? error.message : String(error);
    await feishuClient.replyText(userMessageId, `❌ 处理失败: ${errMsg}`);
  }
}
