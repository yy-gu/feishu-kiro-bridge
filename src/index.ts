// 入口文件 - 启动飞书长连接 + Kiro 桥接

import { feishuClient } from './feishu/client.js';
import { handleMessage } from './handlers/message.js';
import { setupOutputBufferCallback, setupGracefulShutdown } from './handlers/lifecycle.js';
import { validateConfig } from './config.js';

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   飞书 × Kiro CLI 桥接服务 v1.0.0      ║');
  console.log('╚══════════════════════════════════════════╝');

  // 1. 验证配置
  try {
    validateConfig();
  } catch (error) {
    console.error('配置错误:', error);
    process.exit(1);
  }

  // 2. 设置输出缓冲回调
  setupOutputBufferCallback();

  // 3. 设置优雅退出
  setupGracefulShutdown();

  // 4. 注册消息处理
  feishuClient.onMessage((event) => {
    handleMessage(event).catch((err) => {
      console.error('[Main] 消息处理异常:', err);
    });
  });

  // 5. 启动飞书长连接
  await feishuClient.start();

  console.log('[Server] 桥接服务已就绪，等待飞书消息...');
}

main().catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
});
