import { Controller, Post, Body } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('dispatch')
  async dispatchTask(@Body() body: { taskName: string; data: any }) {
    return this.tasksService.dispatchTask(body.taskName, body.data);
  }
}
