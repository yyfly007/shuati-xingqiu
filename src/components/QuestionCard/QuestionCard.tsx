import React from 'react';
import { View, Text } from '@tarojs/components';
import cls from 'classnames';
import { Question } from '../../types';
import { LETTERS, TYPE_SHORT } from '../../utils/format';
import styles from './QuestionCard.module.scss';

export interface QuestionCardProps {
  question: Question;
  /** 当前选中的选项字母 */
  selected?: string[];
  /** idle=可作答态；checked=已判分态（显示对错） */
  status?: 'idle' | 'checked';
  /** 是否显示题型角标 */
  showTypeBadge?: boolean;
  /** 自定义解析（缺省用 question.explanation） */
  explanation?: string;
  /** 解析标题下是否显示正确答案 */
  showAnswer?: boolean;
  onOptionTap?: (letter: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selected = [],
  status = 'idle',
  showTypeBadge = true,
  explanation,
  showAnswer = true,
  onOptionTap,
}) => {
  const checked = status === 'checked';
  const optionText = explanation !== undefined ? explanation : question.explanation;

  const letterClass = (letter: string) => {
    const isCorrectOpt = question.answer.includes(letter);
    const isSelected = selected.includes(letter);
    if (checked) {
      if (isCorrectOpt) return 'correct';
      if (isSelected) return 'wrong';
      return 'idle';
    }
    return isSelected ? 'selected' : 'idle';
  };

  return (
    <View className={styles.card}>
      {showTypeBadge && (
        <View className={cls(styles.badge, styles[question.type])}>
          <Text className={styles.badgeText}>{TYPE_SHORT[question.type] || question.type}</Text>
          {question.type === 'multi' && <Text className={styles.badgeTip}>多选</Text>}
        </View>
      )}
      <Text className={styles.content}>{question.content}</Text>

      <View className={styles.options}>
        {question.options.map((opt, i) => {
          const letter = LETTERS[i];
          return (
            <View
              key={letter}
              className={cls(styles.option, styles[letterClass(letter)])}
              onClick={() => !checked && onOptionTap && onOptionTap(letter)}
            >
              <View className={styles.optionLetter}>
                <Text className={styles.optionLetterText}>{letter}</Text>
              </View>
              <Text className={styles.optionText}>{opt}</Text>
              {checked && question.answer.includes(letter) && (
                <Text className={styles.mark}>✓</Text>
              )}
              {checked && !question.answer.includes(letter) && selected.includes(letter) && (
                <Text className={cls(styles.mark, styles.markWrong)}>✕</Text>
              )}
            </View>
          );
        })}
      </View>

      {checked && (
        <View className={styles.resultBlock}>
          {showAnswer && (
            <Text className={styles.resultLine}>
              正确答案：<Text className={styles.resultAnswer}>{question.answer.join('、')}</Text>
            </Text>
          )}
          {selected.length > 0 && (
            <Text className={styles.resultLine}>
              你的答案：<Text className={styles.resultSelected}>{selected.join('、')}</Text>
            </Text>
          )}
          {optionText ? (
            <View className={styles.explanation}>
              <Text className={styles.explanationText}>解析：{optionText}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

export default QuestionCard;
