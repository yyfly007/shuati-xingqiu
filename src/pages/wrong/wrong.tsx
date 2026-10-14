import React, { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import cls from 'classnames';
import { callFunction } from '../../services/cloud';
import { QuestionType, WrongQuestion } from '../../types';
import { formatDate } from '../../utils/format';
import QuestionCard from '../../components/QuestionCard/QuestionCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import styles from './wrong.module.scss';

type Filter = 'all' | QuestionType;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'single', label: '单选' },
  { key: 'multi', label: '多选' },
  { key: 'judge', label: '判断' },
];

const WrongPage: React.FC = () => {
  const [list, setList] = useState<WrongQuestion[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await callFunction<{ total: number; list: WrongQuestion[] }>('getWrongQuestions', {});
      setList(res.list || []);
    } catch (e) {
      console.error('[wrong] load failed', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useDidShow(load);

  const filtered = useMemo(
    () => (filter === 'all' ? list : list.filter((w) => w.type === filter)),
    [list, filter]
  );

  const onMastered = async (w: WrongQuestion) => {
    setBusyId(w._id);
    try {
      await callFunction('updateWrongQuestion', { wrongId: w._id, action: 'mastered' });
      setList((prev) => prev.filter((x) => x._id !== w._id));
      Taro.showToast({ title: '已标记掌握', icon: 'success' });
    } catch (e) {
      console.error('[wrong] mastered failed', e);
      Taro.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      setBusyId('');
    }
  };

  const onDelete = (w: WrongQuestion) => {
    Taro.showModal({
      title: '删除错题',
      content: '确定从错题本中删除这道题吗？',
      confirmText: '删除',
      success: async (res) => {
        if (!res.confirm) return;
        setBusyId(w._id);
        try {
          await callFunction('updateWrongQuestion', { wrongId: w._id, action: 'delete' });
          setList((prev) => prev.filter((x) => x._id !== w._id));
          Taro.showToast({ title: '已删除', icon: 'success' });
        } catch (e) {
          console.error('[wrong] delete failed', e);
          Taro.showToast({ title: '删除失败', icon: 'none' });
        } finally {
          setBusyId('');
        }
      },
    });
  };

  const startWrongPractice = () => {
    if (filtered.length === 0) {
      Taro.showToast({ title: '当前筛选下没有错题', icon: 'none' });
      return;
    }
    Taro.navigateTo({ url: `/pages/practice-take/practice-take?mode=wrong&count=${Math.min(filtered.length, 50)}` });
  };

  return (
    <View className={styles.container}>
      {/* 顶部操作 */}
      <View className={styles.topCard}>
        <View className={styles.topInfo}>
          <Text className={styles.topTitle}>错题本</Text>
          <Text className={styles.topDesc}>共 {list.length} 题待攻克 · 答对后记得标记掌握</Text>
        </View>
        <View className={cls(styles.practiceBtn, list.length === 0 && styles.practiceBtnDisabled)} onClick={startWrongPractice}>
          <Text className={styles.practiceBtnText}>错题重练</Text>
        </View>
      </View>

      {/* 筛选 */}
      <View className={styles.filterRow}>
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? list.length : list.filter((w) => w.type === f.key).length;
          return (
            <View key={f.key} className={cls(styles.filterChip, f.key === filter && styles.filterActive)} onClick={() => setFilter(f.key)}>
              <Text className={cls(styles.filterText, f.key === filter && styles.filterTextActive)}>
                {f.label}{count > 0 ? ` ${count}` : ''}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 列表 */}
      {loading && list.length === 0 ? (
        <View className={styles.loading}>
          <Text className={styles.loadingText}>加载中…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🎉"
          title={list.length === 0 ? '太棒了，还没有错题' : '该筛选下暂无错题'}
          desc={list.length === 0 ? '开始刷题，错题会自动收集到这里' : '换个筛选条件看看'}
          actionText={list.length === 0 ? '去刷题' : undefined}
          onAction={list.length === 0 ? () => Taro.switchTab({ url: '/pages/practice/practice' }) : undefined}
        />
      ) : (
        <View className={styles.list}>
          {filtered.map((w) => {
            const q = w.question;
            if (!q) return null;
            return (
              <View key={w._id} className={styles.item}>
                <QuestionCard question={q} selected={[]} status="checked" />
                <View className={styles.itemBar}>
                  <Text className={styles.itemMeta}>
                    错 {w.wrongCount} 次 · 最近 {formatDate(w.lastWrongAt)}
                  </Text>
                  <View className={styles.itemActions}>
                    <View
                      className={cls(styles.miniBtn, busyId === w._id && styles.miniBtnDisabled)}
                      onClick={() => onMastered(w)}
                    >
                      <Text className={styles.miniBtnText}>✓ 已掌握</Text>
                    </View>
                    <View
                      className={cls(styles.miniBtn, styles.miniBtnGhost, busyId === w._id && styles.miniBtnDisabled)}
                      onClick={() => onDelete(w)}
                    >
                      <Text className={styles.miniBtnGhostText}>删除</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default WrongPage;
