import React, { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import cls from 'classnames';
import { callFunction } from '../../services/cloud';
import { useUserStore } from '../../store/user';
import { QuestionBank } from '../../types';
import { accuracyRate, formatDate } from '../../utils/format';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './profile.module.scss';

const ProfilePage: React.FC = () => {
  const { user, refresh } = useUserStore();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [wrongTotal, setWrongTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState('');

  useDidShow(async () => {
    await refresh();
    setLoading(true);
    try {
      const [b, w] = await Promise.all([
        callFunction<QuestionBank[]>('getQuestionBanks'),
        callFunction<{ total: number }>('getWrongQuestions', { limit: 1 }),
      ]);
      setBanks(b);
      setWrongTotal(w.total);
    } catch (e) {
      console.error('[profile] load failed', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  });

  const onDeleteBank = (bank: QuestionBank) => {
    Taro.showModal({
      title: '删除题库',
      content: `确定删除「${bank.name}」？题库内的 ${bank.questionCount} 道题目将一并删除，不可恢复。`,
      confirmText: '删除',
      confirmColor: '#F53F3F',
      success: async (res) => {
        if (!res.confirm) return;
        setDeleting(bank._id);
        try {
          await callFunction('deleteBank', { bankId: bank._id });
          setBanks((prev) => prev.filter((b) => b._id !== bank._id));
          Taro.showToast({ title: '已删除', icon: 'success' });
        } catch (e) {
          console.error('[profile] delete bank failed', e);
          Taro.showToast({ title: '删除失败', icon: 'none' });
        } finally {
          setDeleting('');
        }
      },
    });
  };

  return (
    <View className={styles.container}>
      {/* 用户卡 */}
      <View className={styles.userCard}>
        <View className={styles.avatar}>
          {user?.avatarUrl ? (
            <Image className={styles.avatarImg} src={user.avatarUrl} mode="aspectFill" />
          ) : (
            <Text className={styles.avatarEmoji}>🐱</Text>
          )}
        </View>
        <View className={styles.userInfo}>
          <Text className={styles.userName}>{user?.nickname || '刷题同学'}</Text>
          <Text className={styles.userMeta}>
            {user ? `${formatDate(user.createdAt)} 加入刷题星球` : '加载中…'}
          </Text>
        </View>
        <View className={styles.userStats}>
          <View className={styles.userStatItem}>
            <Text className={styles.userStatNum}>{user?.totalAnswered ?? 0}</Text>
            <Text className={styles.userStatLabel}>刷题</Text>
          </View>
          <View className={styles.userStatItem}>
            <Text className={styles.userStatNum}>{wrongTotal}</Text>
            <Text className={styles.userStatLabel}>错题</Text>
          </View>
          <View className={styles.userStatItem}>
            <Text className={styles.userStatNum}>
              {accuracyRate(user?.totalCorrect ?? 0, user?.totalAnswered ?? 0)}%
            </Text>
            <Text className={styles.userStatLabel}>正确率</Text>
          </View>
        </View>
      </View>

      {/* 导入按钮 */}
      <View
        className={styles.importBtn}
        onClick={() => Taro.navigateTo({ url: '/pages/import/import' })}
      >
        <Text className={styles.importIcon}>📥</Text>
        <View className={styles.importTextWrap}>
          <Text className={styles.importTitle}>导入自定义题库</Text>
          <Text className={styles.importDesc}>支持单题录入 / 批量文本 / 表格·文档·PDF 文件</Text>
        </View>
        <Text className={styles.importArrow}>›</Text>
      </View>

      {/* 题库管理 */}
      <Text className={styles.sectionTitle}>题库管理（{banks.length}）</Text>
      {loading && banks.length === 0 ? (
        <View className={styles.loadingBox}>
          <Text className={styles.loadingText}>加载中…</Text>
        </View>
      ) : banks.length === 0 ? (
        <EmptyState icon="📚" title="暂无题库" desc="导入一个自定义题库开始刷题" />
      ) : (
        <View className={styles.bankList}>
          {banks.map((b) => (
            <View key={b._id} className={styles.bankItem}>
              <View className={styles.bankIconWrap}>
                <Text className={styles.bankIcon}>{b.type === 'official' ? '📗' : '📒'}</Text>
              </View>
              <View className={styles.bankInfo}>
                <View className={styles.bankNameRow}>
                  <Text className={styles.bankName}>{b.name}</Text>
                  <Text className={cls(styles.bankTag, b.type === 'official' ? styles.tagOfficial : styles.tagMine)}>
                    {b.type === 'official' ? '官方' : '我的'}
                  </Text>
                </View>
                <Text className={styles.bankMeta}>
                  {b.questionCount} 题 · 单选 {b.typeStats.single} / 多选 {b.typeStats.multi} / 判断 {b.typeStats.judge}
                </Text>
              </View>
              {b.type === 'user' && (
                <View
                  className={cls(styles.delBtn, deleting === b._id && styles.delBtnDisabled)}
                  onClick={() => onDeleteBank(b)}
                >
                  <Text className={styles.delText}>{deleting === b._id ? '…' : '删除'}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* 功能入口 */}
      <View className={styles.entries}>
        <View className={styles.entry} onClick={() => Taro.switchTab({ url: '/pages/wrong/wrong' })}>
          <Text className={styles.entryIcon}>📕</Text>
          <Text className={styles.entryText}>错题本</Text>
          <Text className={styles.entryArrow}>›</Text>
        </View>
        <View className={styles.entry} onClick={() => Taro.switchTab({ url: '/pages/quiz/quiz' })}>
          <Text className={styles.entryIcon}>⏱️</Text>
          <Text className={styles.entryText}>限时测验</Text>
          <Text className={styles.entryArrow}>›</Text>
        </View>
        <View className={styles.entry} onClick={() => Taro.switchTab({ url: '/pages/stats/stats' })}>
          <Text className={styles.entryIcon}>📊</Text>
          <Text className={styles.entryText}>学习统计</Text>
          <Text className={styles.entryArrow}>›</Text>
        </View>
      </View>

      <Text className={styles.footer}>刷题星球 v1.0.0 · Taro + 微信云开发</Text>
    </View>
  );
};

export default ProfilePage;
