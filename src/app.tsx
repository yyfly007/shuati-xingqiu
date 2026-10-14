import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import './app.scss';

// 云开发环境 ID：部署时替换为你的环境 ID（留空则使用默认环境）
const CLOUD_ENV_ID = '';

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('App launched.');
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({
        traceUser: true,
        ...(CLOUD_ENV_ID ? { env: CLOUD_ENV_ID } : {}),
      });
    }
  });

  return children;
}

export default App;
