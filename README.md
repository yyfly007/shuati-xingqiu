# 刷题星球

> 导入自己的题库（PDF / Excel / Word / TXT），练习、限时测验、错题本、学习统计 —— 基于 **Taro 4 + 微信云开发** 的微信小程序刷题工具，克隆即用、免服务器。

`Taro 4.1.9` `React 18` `TypeScript` `微信云开发` `Zustand`

## ✨ 功能

- **题库导入**：支持 `xlsx / xls / csv`、`docx / txt`、`pdf`（文字版，扫描件暂不支持）；题型覆盖单选、多选、判断，导入后可新建或追加到自己的题库
- **练习模式**：逐题作答、即时判对错并显示解析，支持**错题重练**
- **限时测验**：按题库 / 题型组卷，倒计时作答，交卷后查看成绩与每题对错
- **错题本**：答错自动收录，可标记「已掌握」或删除
- **学习统计**：累计答题数、正确率、测验次数、每日打卡
- **多端构建**：主平台微信小程序，同时可编译 H5 / 支付宝 / 抖音等；H5 内置 mock 数据，无需云开发即可本地体验全部功能

## 📸 截图

> TODO：补充小程序截图（建议：练习、测验、错题、统计 各一张）

| 练习 | 测验 | 错题 | 统计 |
| --- | --- | --- | --- |
| 待补充 | 待补充 | 待补充 | 待补充 |

## 📁 项目结构

```
├── cloudfunctions/          # 云函数（13 个）
│   ├── login/               # 登录 / 创建用户
│   ├── getQuestionBanks/    # 题库列表（官方 + 我的）
│   ├── getQuestions/        # 取题（练习 / 错题重练 / 测验）
│   ├── importQuestions/     # 导入自定义题目
│   ├── createQuiz/          # 创建限时测验
│   ├── submitQuiz/          # 交卷（判分 + 记错题 + 统计）
│   ├── submitPractice/      # 提交练习结果（流水 + 统计 + 打卡）
│   ├── getQuizResult/       # 测验结果详情
│   ├── getWrongQuestions/   # 错题列表
│   ├── updateWrongQuestion/ # 错题标记已掌握 / 删除
│   ├── getStats/            # 学习统计
│   ├── deleteBank/          # 删除题库（级联删题 + 错题）
│   └── parsePdf/            # PDF 文本提取（pdf-parse）
├── src/
│   ├── pages/               # 9 个页面（练习/测验/错题/统计/我的/导入…）
│   ├── components/          # 题目卡片、空状态等组件
│   ├── data/                # H5 等平台的 mock 实现（含示例题库种子）
│   ├── services/cloud.ts    # 云函数调用封装（weapp 走云开发，其他走 mock）
│   ├── store/user.ts        # Zustand 用户态
│   ├── utils/               # 文件导入与题目解析（parse.ts / fileImport.ts）
│   ├── styles/              # 主题变量（theme.scss）
│   └── app.tsx              # 入口，cloud.init（CLOUD_ENV_ID 可留空）
├── config/                  # Taro 构建配置
└── dist/                    # 构建产物（已 gitignore）
```

## 🚀 快速开始

### 前置条件

- Node.js >= 18
- 微信开发者工具
- 一个小程序 AppID（个人主体即可）

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 AppID

`project.config.json` 中 `appid` 当前为占位值 `touristappid`（体验模式）。正式开发请替换为你自己的小程序 AppID。

### 3. 初始化云开发

1. 用微信开发者工具打开本项目
2. 点击工具栏「云开发」按钮开通并创建一个环境
3. （可选）把环境 ID 填入 `src/app.tsx` 的 `CLOUD_ENV_ID`，留空则使用默认环境

### 4. 创建数据库集合

在云开发控制台 → 数据库，创建以下 6 个集合（权限建议设置为「仅可通过云函数管理」，前端不直连数据库）：

| 集合 | 用途 |
| --- | --- |
| `users` | 用户信息（累计答题、打卡等） |
| `question_banks` | 题库（`type: official` 官方 / `type: user` 我的） |
| `questions` | 题目 |
| `quizzes` | 测验卷 |
| `answer_records` | 答题流水 |
| `wrong_questions` | 错题 |

### 5. 部署云函数

对 `cloudfunctions/` 下 **每个** 目录，在开发者工具中右键 →「上传并部署：云端安装依赖」，共 13 个。

### 6. 编译运行

```bash
npm run dev:weapp
```

在微信开发者工具中预览。首次使用进入「导入」页导入一份题库（PDF/Excel/Word/TXT）即可开始刷题；也可以先手动往 `question_banks` / `questions` 集合里插入示例数据（可参考 `src/data/mock-db.ts` 中的种子题目）。

### H5 本地预览（无需云开发）

```bash
npm run dev:h5
```

内置 mock 数据与示例题库，全部功能可在浏览器中体验。

## ❓ FAQ

- **为什么 PDF 导入要「从聊天记录选择」？** 微信小程序的文件选择能力限制，需先把文件发到自己的「文件传输助手」，再在小程序里选择。
- **扫描件 / 图片 PDF 不支持？** `parsePdf` 云函数仅提取文字层，扫描件需先 OCR 成文字版 PDF。
- **能换题库 / 题型吗？** 题目解析规则在 `src/utils/parse.ts`，导入入口在 `src/pages/import/import.tsx`。

## 🎨 自定义

- 应用名称、导航栏、TabBar：`src/app.config.ts`
- 主题色：`src/styles/theme.scss` 的 `$color-primary`（默认 `#2e5bff`）
- 题型与解析规则：`src/utils/parse.ts`、`src/utils/fileImport.ts`

## ☕ 支持作者

如果这个项目对你有帮助，欢迎请我喝杯咖啡：

- 爱发电：TODO（补充链接）
- GitHub Sponsors：TODO（补充链接）

## 📄 License

[MIT](./LICENSE) Copyright (c) 2026 yy007
