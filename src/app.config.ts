export default defineAppConfig({
  pages: [
    'pages/practice/practice',
    'pages/practice-take/practice-take',
    'pages/quiz/quiz',
    'pages/quiz-take/quiz-take',
    'pages/quiz-result/quiz-result',
    'pages/wrong/wrong',
    'pages/stats/stats',
    'pages/profile/profile',
    'pages/import/import',
  ],
  window: {
    navigationBarTitleText: '刷题星球',
    navigationBarBackgroundColor: '#2E5BFF',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F6F7',
    backgroundTextStyle: 'dark',
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#2E5BFF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/practice/practice',
        text: '练习',
        iconPath: 'assets/tabbar/practice.svg',
        selectedIconPath: 'assets/tabbar/practice-selected.svg',
      },
      {
        pagePath: 'pages/quiz/quiz',
        text: '测验',
        iconPath: 'assets/tabbar/quiz.svg',
        selectedIconPath: 'assets/tabbar/quiz-selected.svg',
      },
      {
        pagePath: 'pages/wrong/wrong',
        text: '错题',
        iconPath: 'assets/tabbar/wrong.svg',
        selectedIconPath: 'assets/tabbar/wrong-selected.svg',
      },
      {
        pagePath: 'pages/stats/stats',
        text: '统计',
        iconPath: 'assets/tabbar/stats.svg',
        selectedIconPath: 'assets/tabbar/stats-selected.svg',
      },
      {
        pagePath: 'pages/profile/profile',
        text: '我的',
        iconPath: 'assets/tabbar/profile.svg',
        selectedIconPath: 'assets/tabbar/profile-selected.svg',
      },
    ],
  },
});
