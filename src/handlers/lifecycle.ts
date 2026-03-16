// 生命周期管理 - 优雅退出

import { kiroClient } from '../kiro/client.js';

export function setupOutputBufferCallback(): void {
  // no-op: 不再使用流式更新
}

export function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.log(`\n[Lifecycle] 收到 ${signal}，正在优雅退出...`);
    kiroClient.abortAll();
    console.log('[Lifecycle] 清理完成，退出');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    console.error('[Lifecycle] 未捕获异常:', error);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Lifecycle] 未处理的 Promise 拒绝:', reason);
  });
}
