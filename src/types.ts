export type Stage = "todo" | "in-progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  stage: Stage;
  priority: Priority;
  points: number;
  assignee: string;
  deadline?: string;
  tags: string[];
  createdAt: string;
  completedAt?: string;
}
