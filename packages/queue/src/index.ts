import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// ponytail: single shared Redis connection for the queue. No over-engineered factory pool unless needed.
export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const QUEUE_NAME = 'rankforge-tasks';

let realTaskQueue: Queue | null = null;
export const taskQueue = new Proxy({} as Queue, {
  get(target, prop, receiver) {
    if (!realTaskQueue) {
      realTaskQueue = new Queue(QUEUE_NAME, {
        connection: redisConnection,
      });
    }
    const val = Reflect.get(realTaskQueue, prop);
    return typeof val === 'function' ? val.bind(realTaskQueue) : val;
  },
  set(target, prop, value) {
    if (!realTaskQueue) {
      realTaskQueue = new Queue(QUEUE_NAME, {
        connection: redisConnection,
      });
    }
    return Reflect.set(realTaskQueue, prop, value);
  }
});

let realTaskQueueEvents: QueueEvents | null = null;
export const taskQueueEvents = new Proxy({} as QueueEvents, {
  get(target, prop, receiver) {
    if (!realTaskQueueEvents) {
      realTaskQueueEvents = new QueueEvents(QUEUE_NAME, {
        connection: redisConnection,
      });
    }
    const val = Reflect.get(realTaskQueueEvents, prop);
    return typeof val === 'function' ? val.bind(realTaskQueueEvents) : val;
  },
  set(target, prop, value) {
    if (!realTaskQueueEvents) {
      realTaskQueueEvents = new QueueEvents(QUEUE_NAME, {
        connection: redisConnection,
      });
    }
    return Reflect.set(realTaskQueueEvents, prop, value);
  }
});

export { Worker, Queue, QueueEvents };
export * from './idempotency';
