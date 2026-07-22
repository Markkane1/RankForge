import { TaskPriority } from '@prisma/client';

const PRIORITY_SCORE: Record<TaskPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function taskPriorityScore(priority: TaskPriority): number {
  return PRIORITY_SCORE[priority] ?? PRIORITY_SCORE.MEDIUM;
}
