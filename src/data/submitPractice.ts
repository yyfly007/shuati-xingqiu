// mock: submitPractice —— 提交练习结果（流水 + 统计 + 打卡 + 错题）
import { applyAnswerResults, delay } from './mock-db';

export default async (data: {
  items: { questionId: string; bankId: string; type: string; userAnswer: string[]; isCorrect: boolean }[];
  mode?: 'practice' | 'quiz';
}): Promise<{ correctCount: number; totalCount: number }> => {
  await delay(300);
  return applyAnswerResults(data.items || [], data.mode || 'practice');
};
