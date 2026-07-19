import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
// ponytail: single shared Redis connection for the queue. No over-engineered factory pool unless needed.
export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
});
export const QUEUE_NAME = 'rankforge-tasks';
export const taskQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
});
export const taskQueueEvents = new QueueEvents(QUEUE_NAME, {
    connection: redisConnection,
});
export { Worker, Queue, QueueEvents };
export * from './idempotency';
