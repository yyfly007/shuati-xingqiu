// mock: getQuizResult —— 获取测验卷与题目（用于作答 / 结果回顾）
import { Question, Quiz } from '../types';
import { clone, delay, getDb } from './mock-db';

export default async (data: { quizId: string }): Promise<{ quiz: Quiz; questions: Question[] }> => {
  await delay(300);
  const db = getDb();
  const quiz = db.quizzes.find((q) => q._id === data.quizId);
  if (!quiz) throw new Error('测验不存在');
  const questions = quiz.questionIds
    .map((id) => db.questions.find((q) => q._id === id))
    .filter((q): q is Question => Boolean(q));
  return { quiz: clone(quiz), questions: clone(questions) };
};
