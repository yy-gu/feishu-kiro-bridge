import { AsyncQueue } from './async-queue.js';

class SessionQueueManager {
  private queues = new Map<string, AsyncQueue>();

  getOrCreate(sessionId: string): AsyncQueue {
    let queue = this.queues.get(sessionId);
    if (!queue) {
      queue = new AsyncQueue();
      this.queues.set(sessionId, queue);
    }
    return queue;
  }

  remove(sessionId: string): void {
    const queue = this.queues.get(sessionId);
    if (queue) {
      queue.clear();
      this.queues.delete(sessionId);
    }
  }

  getStatus(): Array<{ sessionId: string; pending: number; processing: boolean }> {
    return Array.from(this.queues.entries()).map(([sessionId, queue]) => ({
      sessionId,
      pending: queue.length,
      processing: queue.isProcessing,
    }));
  }
}

export const sessionQueueManager = new SessionQueueManager();
