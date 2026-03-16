// Kiro CLI 子进程管理 - 通过 --no-interactive 模式调用，--resume 保持上下文

import { spawn, type ChildProcess } from 'child_process';
import { kiroConfig } from '../config.js';

export interface KiroResult {
  output: string;
  exitCode: number | null;
  timedOut: boolean;
}

export type KiroStreamCallback = (chunk: string) => void;

export class KiroClient {
  private activeProcesses = new Map<string, ChildProcess>();
  private resumableSessions = new Set<string>();

  async ask(
    question: string,
    sessionKey: string,
    onChunk?: KiroStreamCallback
  ): Promise<KiroResult> {
    this.abort(sessionKey);

    const args = ['chat', '--no-interactive', '--trust-all-tools', '--wrap', 'never'];
    if (this.resumableSessions.has(sessionKey)) {
      args.push('--resume');
    }
    if (kiroConfig.agent) {
      args.push('--agent', kiroConfig.agent);
    }
    args.push(question);

    const cwd = kiroConfig.workDirectory || process.cwd();

    return new Promise<KiroResult>((resolve) => {
      const child = spawn('kiro-cli', args, {
        cwd,
        env: { ...process.env, KIRO_LOG_NO_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(sessionKey, child);

      const chunks: string[] = [];
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 2000);
      }, kiroConfig.timeoutMs);

      child.stdout!.setEncoding('utf-8');
      child.stdout!.on('data', (data: string) => {
        chunks.push(data);
        onChunk?.(data);
      });

      child.stderr!.setEncoding('utf-8');
      child.stderr!.on('data', (data: string) => {
        console.error(`[Kiro][${sessionKey}] stderr:`, data.trim());
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        this.activeProcesses.delete(sessionKey);
        if (code === 0) {
          this.resumableSessions.add(sessionKey);
        }
        resolve({ output: chunks.join(''), exitCode: code, timedOut });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        this.activeProcesses.delete(sessionKey);
        console.error(`[Kiro][${sessionKey}] 进程错误:`, err.message);
        resolve({ output: `Kiro CLI 启动失败: ${err.message}`, exitCode: -1, timedOut: false });
      });
    });
  }

  resetSession(sessionKey: string): void {
    this.abort(sessionKey);
    this.resumableSessions.delete(sessionKey);
  }

  abort(sessionKey: string): boolean {
    const child = this.activeProcesses.get(sessionKey);
    if (!child) return false;
    child.kill('SIGTERM');
    this.activeProcesses.delete(sessionKey);
    console.log(`[Kiro] 已终止会话 ${sessionKey} 的进程`);
    return true;
  }

  abortAll(): void {
    for (const [key, child] of this.activeProcesses) {
      child.kill('SIGTERM');
      console.log(`[Kiro] 终止进程: ${key}`);
    }
    this.activeProcesses.clear();
  }

  get activeCount(): number {
    return this.activeProcesses.size;
  }
}

export const kiroClient = new KiroClient();
