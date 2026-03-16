// 斜杠命令拦截与处理

import { execFile } from 'child_process';
import { promisify } from 'util';

import { kiroClient } from '../kiro/client.js';

const exec = promisify(execFile);

const AVAILABLE_MODELS = [
  'auto', 'claude-opus-4.6', 'claude-sonnet-4.6',
  'claude-opus-4.5', 'claude-sonnet-4.5', 'claude-sonnet-4', 'claude-haiku-4.5',
];

async function run(cmd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await exec(cmd, args, { timeout: 10_000 });
    return stdout.trim();
  } catch (e: any) {
    return e.stderr?.trim() || e.stdout?.trim() || e.message;
  }
}

async function handleModel(arg: string): Promise<string> {
  if (!arg) {
    const current = await run('kiro-cli', ['settings', 'chat.defaultModel']);
    const cur = current || 'auto（未设置）';
    const list = AVAILABLE_MODELS.map(m => `  • ${m}`).join('\n');
    return `📋 当前模型: ${cur}\n\n可用模型:\n${list}\n\n切换方式: /model <模型名>`;
  }
  if (!AVAILABLE_MODELS.includes(arg)) {
    return `❌ 未知模型「${arg}」\n\n可用: ${AVAILABLE_MODELS.join(', ')}`;
  }
  const result = await run('kiro-cli', ['settings', 'chat.defaultModel', arg]);
  return result || `✅ 已切换默认模型为 ${arg}`;
}

async function handleAgent(arg: string): Promise<string> {
  if (!arg) {
    const list = await run('kiro-cli', ['agent', 'list']);
    return `📋 可用 Agent:\n\n${list || '（无）'}\n\n切换方式: /agent <名称>`;
  }
  const result = await run('kiro-cli', ['agent', 'set-default', arg]);
  return result || `✅ 已设置默认 Agent 为 ${arg}`;
}

const HELP_TEXT = `📖 支持的命令:

/new            开始新对话（清除上下文）
/model          查看当前模型和可用列表
/model <名称>   切换默认模型
/agent          查看可用 Agent 列表
/agent <名称>   切换默认 Agent
/help           显示此帮助`;

/**
 * 尝试处理斜杠命令。返回回复文本，如果不是斜杠命令则返回 null。
 */
export async function handleSlashCommand(text: string, chatId?: string): Promise<string | null> {
  if (!text.startsWith('/')) return null;

  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ').trim();

  switch (cmd) {
    case '/new':
      if (chatId) kiroClient.resetSession(chatId);
      return '🔄 已开始新对话';
    case '/model': return handleModel(arg);
    case '/agent': return handleAgent(arg);
    case '/help':  return HELP_TEXT;
    default:       return `❓ 不支持的命令「${cmd}」\n\n输入 /help 查看可用命令`;
  }
}
