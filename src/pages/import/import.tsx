import React, { useState } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import cls from 'classnames';
import { callFunction } from '../../services/cloud';
import { QuestionBank, QuestionType } from '../../types';
import { LETTERS, TYPE_SHORT } from '../../utils/format';
import { exampleImportText, parseQuestions, toImportQuestion, ParseResult } from '../../utils/parse';
import { pickFile, questionsFromSheet, textFromDocx, textFromBuffer, textFromPdf, FileKind } from '../../utils/fileImport';
import styles from './import.module.scss';

type Mode = 'single' | 'batch' | 'file';
const SINGLE_TYPES: QuestionType[] = ['single', 'multi', 'judge'];
// 微信小程序端原生导航栏自带返回按钮，仅 H5 预览需要页内返回
const SHOW_BACK_BTN = Taro.getEnv() !== Taro.ENV_TYPE.WEAPP;

const FILE_KINDS: { kind: FileKind; label: string; badge: string; badgeCls: string; ext: string }[] = [
  { kind: 'sheet', label: '表格', badge: 'XLS', badgeCls: 'fileBadgeSheet', ext: 'xlsx / xls / csv' },
  { kind: 'doc', label: '文档', badge: 'DOC', badgeCls: 'fileBadgeDoc', ext: 'docx / txt' },
  { kind: 'pdf', label: 'PDF', badge: 'PDF', badgeCls: 'fileBadgePdf', ext: 'pdf' },
];

const ImportPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('single');
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [bankChoice, setBankChoice] = useState<string>('new');
  const [bankName, setBankName] = useState('');

  // 单题
  const [qType, setQType] = useState<QuestionType>('single');
  const [content, setContent] = useState('');
  const [opts, setOpts] = useState<string[]>(['', '', '', '']);
  const [answer, setAnswer] = useState<string[]>([]);
  const [explanation, setExplanation] = useState('');

  // 批量
  const [batchText, setBatchText] = useState('');
  const [parseRes, setParseRes] = useState<ParseResult | null>(null);

  // 文件导入
  const [fileLoading, setFileLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileRes, setFileRes] = useState<ParseResult | null>(null);

  const [saving, setSaving] = useState(false);

  useDidShow(async () => {
    try {
      const list = await callFunction<QuestionBank[]>('getQuestionBanks');
      const mine = list.filter((b) => b.type === 'user');
      setBanks(mine);
      setBankChoice((prev) => (prev !== 'new' && mine.some((b) => b._id === prev) ? prev : 'new'));
    } catch (e) {
      console.error('[import] load banks failed', e);
    }
  });

  const toast = (title: string) => Taro.showToast({ title, icon: 'none' });

  const onBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      // 直接打开本页（无页面栈）时兜底回「我的」
      Taro.switchTab({ url: '/pages/profile/profile' });
    }
  };

  const toggleAnswer = (letter: string) => {
    if (qType === 'multi') {
      setAnswer((prev) => (prev.includes(letter) ? prev.filter((x) => x !== letter) : [...prev, letter]));
    } else {
      setAnswer([letter]);
    }
  };

  // ---------- 统一导入（超过 100 题自动分批） ----------
  const doImportInBatches = async (list: ReturnType<typeof toImportQuestion>[]) => {
    const CHUNK = 100;
    let bankId: string | undefined = bankChoice === 'new' ? undefined : bankChoice;
    for (let i = 0; i < list.length; i += CHUNK) {
      const res = await callFunction<{ bankId: string; count: number }>('importQuestions', {
        bankId,
        bankName: bankId ? undefined : bankName.trim(),
        questions: list.slice(i, i + CHUNK),
      });
      bankId = res.bankId;
    }
  };

  // ---------- 单题保存 ----------
  const saveSingle = async () => {
    if (saving) return;
    const nonEmpty = opts
      .map((o, i) => ({ letter: LETTERS[i], text: o.trim() }))
      .filter((x) => x.text);

    if (!content.trim()) return toast('请填写题目内容');
    if (qType !== 'judge' && nonEmpty.length < 2) return toast('单选题和多选题至少需要 A、B 两个选项');
    if (answer.length === 0) return toast('请选择正确答案');
    if (qType === 'single' && answer.length !== 1) return toast('单选题答案只能选一个');
    if (qType === 'multi' && answer.length < 2) return toast('多选题答案至少选两个');
    if (qType !== 'judge' && answer.some((a) => !nonEmpty.some((n) => n.letter === a)))
      return toast('正确答案必须来自已填写的选项');
    if (bankChoice === 'new' && !bankName.trim()) return toast('请填写新题库名称');

    setSaving(true);
    try {
      await callFunction('importQuestions', {
        bankId: bankChoice === 'new' ? undefined : bankChoice,
        bankName: bankChoice === 'new' ? bankName.trim() : undefined,
        questions: [
          {
            type: qType,
            content: content.trim(),
            options: qType === 'judge' ? ['正确', '错误'] : nonEmpty.map((n) => n.text),
            answer: [...answer].sort(),
            explanation: explanation.trim(),
          },
        ],
      });
      Taro.showToast({ title: '导入成功', icon: 'success' });
      setContent('');
      setOpts(['', '', '', '']);
      setAnswer([]);
      setExplanation('');
    } catch (e) {
      console.error('[import] save single failed', e);
      toast('导入失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // ---------- 批量 ----------
  const doParse = () => {
    if (!batchText.trim()) {
      toast('请先粘贴题目内容');
      return;
    }
    const res = parseQuestions(batchText);
    setParseRes(res);
    if (res.questions.length === 0) toast('未解析到有效题目');
    else toast(`解析到 ${res.questions.length} 题`);
  };

  const saveBatch = async () => {
    if (saving) return;
    const res = parseQuestions(batchText);
    setParseRes(res);
    if (res.questions.length === 0) return toast('没有可导入的题目');
    if (bankChoice === 'new' && !bankName.trim()) return toast('请填写新题库名称');

    setSaving(true);
    try {
      await doImportInBatches(res.questions.map(toImportQuestion));
      Taro.showModal({
        title: '导入成功',
        content: `已导入 ${res.questions.length} 道题，去「我的」里查看题库吧`,
        showCancel: false,
        success: () => Taro.navigateBack(),
      });
    } catch (e) {
      console.error('[import] save batch failed', e);
      toast('导入失败，请重试');
      setSaving(false);
    }
  };

  // ---------- 文件导入 ----------
  const handleFile = async (kind: FileKind) => {
    if (fileLoading) return;
    setFileLoading(true);
    Taro.showLoading({ title: '正在解析文件…', mask: true });
    try {
      const file = await pickFile(kind);
      setFileName(file.name);
      setFileRes(null);

      let res: ParseResult;
      if (kind === 'sheet') {
        res = questionsFromSheet(file.buffer, file.name);
      } else if (kind === 'doc') {
        const text = file.name.toLowerCase().endsWith('.docx')
          ? await textFromDocx(file.buffer)
          : textFromBuffer(file.buffer);
        res = parseQuestions(text);
      } else {
        const text = await textFromPdf(file);
        res = parseQuestions(text);
      }

      setFileRes(res);
      // 新建题库时自动用文件名填充
      if (bankChoice === 'new' && !bankName.trim()) {
        setBankName(file.name.replace(/\.[^.]+$/, ''));
      }
      if (res.questions.length === 0) Taro.showToast({ title: '未解析到有效题目', icon: 'none' });
      else Taro.showToast({ title: `解析到 ${res.questions.length} 题`, icon: 'success' });
    } catch (e: any) {
      console.error('[import] file parse failed', e);
      if (e?.message !== 'CANCEL') {
        Taro.showToast({ title: e?.message || '文件解析失败', icon: 'none' });
      }
    } finally {
      Taro.hideLoading();
      setFileLoading(false);
    }
  };

  const saveFile = async () => {
    if (saving || !fileRes || fileRes.questions.length === 0) return;
    if (bankChoice === 'new' && !bankName.trim()) return toast('请填写新题库名称');

    setSaving(true);
    try {
      await doImportInBatches(fileRes.questions.map(toImportQuestion));
      Taro.showModal({
        title: '导入成功',
        content: `已导入 ${fileRes.questions.length} 道题，去「我的」里查看题库吧`,
        showCancel: false,
        success: () => Taro.navigateBack(),
      });
    } catch (e) {
      console.error('[import] save file failed', e);
      toast('导入失败，请重试');
      setSaving(false);
    }
  };

  const optionLetters = opts.map((o, i) => ({ letter: LETTERS[i], text: o.trim() })).filter((x) => x.text);

  return (
    <View className={styles.container}>
      {SHOW_BACK_BTN && (
        <View className={styles.backBar} onClick={onBack}>
          <Text className={styles.backArrow}>‹</Text>
          <Text className={styles.backText}>返回</Text>
        </View>
      )}
      {/* 模式切换 */}
      <View className={styles.modeRow}>
        <View className={cls(styles.modeTab, mode === 'single' && styles.modeTabActive)} onClick={() => setMode('single')}>
          <Text className={cls(styles.modeText, mode === 'single' && styles.modeTextActive)}>单题录入</Text>
        </View>
        <View className={cls(styles.modeTab, mode === 'batch' && styles.modeTabActive)} onClick={() => setMode('batch')}>
          <Text className={cls(styles.modeText, mode === 'batch' && styles.modeTextActive)}>文本批量</Text>
        </View>
        <View className={cls(styles.modeTab, mode === 'file' && styles.modeTabActive)} onClick={() => setMode('file')}>
          <Text className={cls(styles.modeText, mode === 'file' && styles.modeTextActive)}>文件导入</Text>
        </View>
      </View>

      {/* 题库选择 */}
      <View className={styles.card}>
        <Text className={styles.label}>导入到题库</Text>
        <View className={styles.bankChoiceRow}>
          <View className={cls(styles.bankChoice, bankChoice === 'new' && styles.bankChoiceActive)} onClick={() => setBankChoice('new')}>
            <Text className={styles.bankChoiceText}>新建题库</Text>
          </View>
          {banks.map((b) => (
            <View
              key={b._id}
              className={cls(styles.bankChoice, bankChoice === b._id && styles.bankChoiceActive)}
              onClick={() => setBankChoice(b._id)}
            >
              <Text className={styles.bankChoiceText}>{b.name}</Text>
            </View>
          ))}
        </View>
        {bankChoice === 'new' && (
          <Input
            className={styles.input}
            placeholder="输入新题库名称（如：高中数学题库）"
            value={bankName}
            onInput={(e) => setBankName(e.detail.value)}
          />
        )}
      </View>

      {mode === 'single' ? (
        <>
          {/* 题型 */}
          <View className={styles.card}>
            <Text className={styles.label}>题型</Text>
            <View className={styles.chipRow}>
              {SINGLE_TYPES.map((t) => (
                <View
                  key={t}
                  className={cls(styles.chip, qType === t && styles.chipActive)}
                  onClick={() => {
                    setQType(t);
                    setAnswer([]);
                  }}
                >
                  <Text className={cls(styles.chipText, qType === t && styles.chipTextActive)}>{TYPE_SHORT[t]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 题干 */}
          <View className={styles.card}>
            <Text className={styles.label}>题目内容</Text>
            <Textarea
              className={styles.textarea}
              placeholder="请输入题目，如：下列哪个数是质数？"
              value={content}
              autoHeight
              maxlength={200}
              onInput={(e) => setContent(e.detail.value)}
            />
          </View>

          {/* 选项 */}
          {qType !== 'judge' && (
            <View className={styles.card}>
              <Text className={styles.label}>选项（A、B 必填，C、D 可选）</Text>
              {opts.map((o, i) => (
                <View key={LETTERS[i]} className={styles.optRow}>
                  <Text className={styles.optLetter}>{LETTERS[i]}</Text>
                  <Input
                    className={styles.input}
                    placeholder={`选项 ${LETTERS[i]}`}
                    value={o}
                    maxlength={50}
                    onInput={(e) =>
                      setOpts((prev) => prev.map((p, j) => (j === i ? e.detail.value : p)))
                    }
                  />
                </View>
              ))}
            </View>
          )}

          {/* 答案 */}
          <View className={styles.card}>
            <Text className={styles.label}>
              {qType === 'multi' ? '正确答案（可多选）' : '正确答案'}
            </Text>
            <View className={styles.chipRow}>
              {(qType === 'judge' ? ['A', 'B'] : optionLetters.map((x) => x.letter)).map((letter) => (
                <View
                  key={letter}
                  className={cls(styles.chip, answer.includes(letter) && styles.chipAnswer)}
                  onClick={() => toggleAnswer(letter)}
                >
                  <Text className={cls(styles.chipText, answer.includes(letter) && styles.chipAnswerText)}>
                    {qType === 'judge' ? (letter === 'A' ? '正确' : '错误') : letter}
                  </Text>
                </View>
              ))}
              {qType !== 'judge' && optionLetters.length === 0 && (
                <Text className={styles.tip}>请先填写选项</Text>
              )}
            </View>
          </View>

          {/* 解析 */}
          <View className={styles.card}>
            <Text className={styles.label}>解析（可选）</Text>
            <Input
              className={styles.input}
              placeholder="为什么选这个答案"
              value={explanation}
              maxlength={100}
              onInput={(e) => setExplanation(e.detail.value)}
            />
          </View>

          <View className={cls(styles.saveBtn, saving && styles.saveBtnDisabled)} onClick={saveSingle}>
            <Text className={styles.saveBtnText}>{saving ? '保存中…' : '保存这道题'}</Text>
          </View>
        </>
      ) : mode === 'batch' ? (
        <>
          {/* 格式说明 */}
          <View className={styles.card}>
            <View className={styles.headRow}>
              <Text className={styles.label}>粘贴格式说明</Text>
              <View className={styles.exampleBtn} onClick={() => { setBatchText(exampleImportText()); setParseRes(null); }}>
                <Text className={styles.exampleText}>填入示例</Text>
              </View>
            </View>
            <View className={styles.formatBox}>
              <Text className={styles.formatText}>
                {'两种格式都支持：\n① 规范格式：首行 [题型] 题目，选项 A. B. C.，末行 答案：X\n② 常见格式：序号开头，如 1. 题目 A. 选项1 B. 选项2 答案：C（选项可同行可换行，题型自动识别）\n题型支持：单选 / 多选 / 判断，多选答案用逗号：答案：A,C'}
              </Text>
            </View>
          </View>

          {/* 文本输入 */}
          <View className={styles.card}>
            <Text className={styles.label}>题目内容（批量）</Text>
            <Textarea
              className={cls(styles.textarea, styles.batchTextarea)}
              placeholder="在此粘贴题目…"
              value={batchText}
              maxlength={-1}
              onInput={(e) => {
                setBatchText(e.detail.value);
                setParseRes(null);
              }}
            />
            <View className={styles.parseRow}>
              <View className={styles.parseBtn} onClick={doParse}>
                <Text className={styles.parseBtnText}>解析预览</Text>
              </View>
              {parseRes && (
                <Text className={styles.parseSummary}>
                  解析 {parseRes.questions.length} 题
                  {parseRes.errors.length > 0 ? ` · ${parseRes.errors.length} 处错误` : ' · 全部有效'}
                </Text>
              )}
            </View>
            {parseRes && parseRes.errors.length > 0 && (
              <View className={styles.errorBox}>
                {parseRes.errors.slice(0, 3).map((err, i) => (
                  <Text key={i} className={styles.errorText}>· {err}</Text>
                ))}
                {parseRes.errors.length > 3 && (
                  <Text className={styles.errorText}>· 还有 {parseRes.errors.length - 3} 处错误…</Text>
                )}
              </View>
            )}
          </View>

          <View className={cls(styles.saveBtn, saving && styles.saveBtnDisabled)} onClick={saveBatch}>
            <Text className={styles.saveBtnText}>{saving ? '导入中…' : '确认导入'}</Text>
          </View>
        </>
      ) : (
        <>
          {/* 选择文件 */}
          <View className={styles.card}>
            <Text className={styles.label}>选择文件</Text>
            <View className={styles.fileBtnRow}>
              {FILE_KINDS.map((f) => (
                <View key={f.kind} className={styles.fileBtn} onClick={() => handleFile(f.kind)}>
                  <View className={cls(styles.fileBadge, styles[f.badgeCls as keyof typeof styles])}>
                    <Text className={styles.fileBadgeText}>{f.badge}</Text>
                  </View>
                  <Text className={styles.fileBtnText}>{f.label}</Text>
                  <Text className={styles.fileBtnExt}>{f.ext}</Text>
                </View>
              ))}
            </View>
            <Text className={styles.tip}>
              表格按表头识别（题干/题型/A/B/C/D/答案/解析），文档与 PDF 提取文字后自动解析
            </Text>
            <Text className={styles.tip}>微信内使用：先把文件发到「文件传输助手」，点击按钮后会从聊天记录中选择</Text>
          </View>

          {/* 解析结果 */}
          {fileName && (
            <View className={styles.card}>
              <View className={styles.headRow}>
                <Text className={styles.fileName}>{fileName}</Text>
                {fileRes && (
                  <Text className={styles.parseSummary}>
                    解析 {fileRes.questions.length} 题
                    {fileRes.errors.length > 0 ? ` · ${fileRes.errors.length} 处问题` : ' · 全部有效'}
                  </Text>
                )}
              </View>
              {fileRes && fileRes.questions.length > 0 && (
                <View className={styles.previewBox}>
                  {fileRes.questions.slice(0, 2).map((q, i) => (
                    <Text key={i} className={styles.previewText}>
                      {i + 1}. [{TYPE_SHORT[q.type]}] {q.content}（答案 {q.answer.join('')}）
                    </Text>
                  ))}
                </View>
              )}
              {fileRes && fileRes.errors.length > 0 && (
                <View className={styles.errorBox}>
                  {fileRes.errors.slice(0, 3).map((err, i) => (
                    <Text key={i} className={styles.errorText}>· {err}</Text>
                  ))}
                  {fileRes.errors.length > 3 && (
                    <Text className={styles.errorText}>· 还有 {fileRes.errors.length - 3} 处问题…</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {fileRes && fileRes.questions.length > 0 && (
            <View className={cls(styles.saveBtn, saving && styles.saveBtnDisabled)} onClick={saveFile}>
              <Text className={styles.saveBtnText}>
                {saving ? '导入中…' : `确认导入 ${fileRes.questions.length} 题`}
              </Text>
            </View>
          )}
        </>
      )}

      <Text className={styles.footerTip}>导入的题目可在「我的 - 题库管理」中查看或删除</Text>
    </View>
  );
};

export default ImportPage;
