// mock: submitQuiz —— 交卷判分（更新测验 + 统计 + 打卡 + 错题）
import { applyAnswerResults, clone, delay, getDb, nowIso } from './mock-db';
import { sameAnswer } from '../utils/format';

export default async (data: {
  quizId: string;
  answers: Record<string, string[]>;
  timeUsedSec?: number;
}): Promise<{ correctCount: number; total: number }> => {
  await delay(300);
  const db = getDb();
  const quiz = db.quizzes.find((q) => q._id === data.quizId);
  if (!quiz) throw new Error('测验不存在');
  if (quiz.status === 'submitted') {
    return { correctCount: quiz.correctCount || 0, total: quiz.count };
  }

  const answers = data.answers || {};
  const items: { questionId: string; bankId: string; type: string; userAnswer: string[]; isCorrect: boolean }[] = [];
  let correctCount = 0;

  quiz.questionIds.forEach((qid) => {
    const q = db.questions.find((x) => x._id === qid);
    if (!q) return;
    const userAnswer = answers[qid] || [];
    const isCorrect = sameAnswer(userAnswer, q.answer);
    if (isCorrect) correctCount++;
    items.push({ questionId: q._id, bankId: q.bankId, type: q.type, userAnswer, isCorrect });
  });

  quiz.status = 'submitted';
  quiz.answers = clone(answers);
  quiz.correctCount = correctCount;
  quiz.timeUsedSec = data.timeUsedSec || 0;
  quiz.submittedAt = nowIso();
  db.user.quizCount++;

  applyAnswerResults(items, 'quiz');
  return { correctCount, total: quiz.count };
};
