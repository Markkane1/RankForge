import { TasksService } from './tasks.service';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    dispatchTask(body: {
        taskName: string;
        data: any;
    }): Promise<{
        jobId: string | undefined;
    }>;
}
