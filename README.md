# feishu-kiro-bridge

飞书机器人 × [Kiro CLI](https://kiro.dev) 桥接服务。在飞书里直接和 Kiro AI 对话，支持多轮上下文、模型切换和 Agent 管理。

## 工作原理

```
飞书用户 ──消息──▶ 飞书开放平台 ──WebSocket──▶ feishu-kiro-bridge ──spawn──▶ kiro-cli
                                                      ◀──回复──                ◀──stdout──
```

- 通过飞书 WSClient 长连接接收消息（无需公网 IP / Webhook）
- 每条消息调用 `kiro-cli chat --no-interactive` 执行
- 使用 `--resume` 自动接续同一聊天窗口的上下文
- 斜杠命令在 bridge 层拦截，调用 kiro-cli 子命令实现

## 前置条件

- Node.js >= 18
- [kiro-cli](https://kiro.dev/docs/cli/) 已安装并登录
- 飞书自建应用（获取 App ID / App Secret）

### 飞书应用配置

1. 进入 [飞书开发者后台](https://open.feishu.cn/app) 创建自建应用
2. **事件与回调** → 订阅方式选择 **使用长连接接收事件**
3. **事件订阅** → 添加 `im.message.receive_v1`
4. **权限管理** → 开通 `im:message`、`im:message:send_as_bot`
5. 发布应用版本

## 快速开始

```bash
# 克隆
git clone https://github.com/yy-gu/feishu-kiro-bridge.git
cd feishu-kiro-bridge

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入飞书 App ID 和 App Secret

# 启动（开发模式，带热重载）
npm run dev
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `FEISHU_APP_ID` | ✅ | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | ✅ | 飞书应用 App Secret |
| `KIRO_WORK_DIRECTORY` | | Kiro 工作目录，默认为当前目录 |
| `KIRO_AGENT` | | 指定 Kiro Agent |
| `KIRO_TIMEOUT_MS` | | 单次请求超时，默认 `120000` |
| `ALLOWED_USERS` | | 用户白名单，逗号分隔的飞书 open_id，为空不限制 |
| `GROUP_REQUIRE_MENTION` | | 群聊是否需要 @机器人 才触发，默认 `true` |

## 斜杠命令

在飞书聊天中直接发送：

| 命令 | 说明 |
|------|------|
| `/new` | 开始新对话（清除上下文） |
| `/model` | 查看当前模型和可用列表 |
| `/model <名称>` | 切换默认模型 |
| `/agent` | 查看可用 Agent 列表 |
| `/agent <名称>` | 切换默认 Agent |
| `/help` | 显示帮助 |

其他消息会直接转发给 Kiro CLI 处理。

## 项目结构

```
src/
├── index.ts                 # 入口，启动飞书长连接
├── config.ts                # 环境变量解析与校验
├── feishu/
│   └── client.ts            # 飞书 API 封装（收发消息）
├── kiro/
│   ├── client.ts            # Kiro CLI 子进程管理（--resume 上下文）
│   └── output-buffer.ts     # 输出缓冲
├── handlers/
│   ├── message.ts           # 消息路由与处理
│   ├── slash-commands.ts    # 斜杠命令拦截
│   └── lifecycle.ts         # 优雅退出
├── store/
│   └── chat-session.ts      # 会话状态持久化
└── utils/
    ├── async-queue.ts        # 异步串行队列
    └── session-queue.ts      # 按会话串行处理
```

## 构建与部署

```bash
# 编译
npm run build

# 生产运行
npm start
```

建议使用 `systemd`、`pm2` 或 `docker` 保持服务常驻。

## License

MIT
