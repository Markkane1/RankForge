import { Injectable } from '@nestjs/common';
import { taskQueue } from '@rankforge/queue';

@Injectable()
export class TasksService {
  async dispatchTask(taskName: string, data: any) {
    // ponytail: minimal queue dispatch. Standard bullmq wrapper.
    const job = await taskQueue.add(taskName, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return { jobId: job.id };
  }
}
