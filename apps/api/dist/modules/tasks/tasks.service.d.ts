export declare class TasksService {
    dispatchTask(taskName: string, data: any): Promise<{
        jobId: string | undefined;
    }>;
}
