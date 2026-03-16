// 通用异步队列 - 保证任务串行执行

type QueueTask<T> = () => Promise<T>;

interface QueueItem<T> {
  task: QueueTask<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class AsyncQueue {
  private queue: QueueItem<unknown>[] = [];
  private processing = false;

  async enqueue<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task: task as QueueTask<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const item = this.queue.shift()!;
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.processing = false;
      this.processNext();
    }
  }

  get length(): number { return this.queue.length; }
  get isProcessing(): boolean { return this.processing; }

  clear(): void {
    const items = this.queue.splice(0);
    for (const item of items) {
      item.reject(new Error('队列已清空'));
    }
  }
}
