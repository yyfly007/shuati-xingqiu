import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './EmptyState.module.scss';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  desc?: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, desc, actionText, onAction }) => {
  return (
    <View className={styles.wrap}>
      <Text className={styles.icon}>{icon}</Text>
      <Text className={styles.title}>{title}</Text>
      {desc ? <Text className={styles.desc}>{desc}</Text> : null}
      {actionText ? (
        <View className={styles.action} onClick={onAction}>
          <Text className={styles.actionText}>{actionText}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default EmptyState;
