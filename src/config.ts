import 'dotenv/config';

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return fallback;
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const feishuConfig = {
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
  encryptKey: process.env.FEISHU_ENCRYPT_KEY,
};

export const kiroConfig = {
  workDirectory: process.env.KIRO_WORK_DIRECTORY?.trim() || undefined,
  agent: process.env.KIRO_AGENT?.trim() || undefined,
  timeoutMs: parseIntEnv(process.env.KIRO_TIMEOUT_MS, 120_000),
};

export const userConfig = {
  allowedUsers: (process.env.ALLOWED_USERS || '')
    .split(',').map(s => s.trim()).filter(Boolean),
  get isWhitelistEnabled() {
    return this.allowedUsers.length > 0;
  },
};

export const groupConfig = {
  requireMentionInGroup: parseBooleanEnv(process.env.GROUP_REQUIRE_MENTION, true),
};

export const outputConfig = {
  updateInterval: parseIntEnv(process.env.OUTPUT_UPDATE_INTERVAL, 3000),
  maxMessageLength: 4000,
};

export function validateConfig(): void {
  const errors: string[] = [];
  if (!feishuConfig.appId) errors.push('缺少 FEISHU_APP_ID');
  if (!feishuConfig.appSecret) errors.push('缺少 FEISHU_APP_SECRET');
  if (errors.length > 0) {
    throw new Error(`配置错误:\n${errors.join('\n')}`);
  }
}
