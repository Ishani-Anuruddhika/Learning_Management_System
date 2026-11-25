export type Role = 'student' | 'teacher' | 'admin';
export type User = { id: string; email: string; fullName: string; role: Role; stream: string };
export type Lesson = {
  id: string; title: string; mins: number; type: 'video' | 'notes' | 'quiz';
  hasFile: boolean; fileName?: string | null;
};
export type Course = {
  id: string; title: string; stream: string; teacher: string; level: string; color: string; lessons: Lesson[];
};
