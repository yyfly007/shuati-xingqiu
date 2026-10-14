// pdf.js 空实现（仅用于微信小程序构建占位）。
// 小程序端 PDF 解析走云函数 parsePdf，不需要打包 pdf.js；
// 此模块在 web 构建中不会被引用（web 端解析见 src/data/parsePdf.ts mock）。

function notSupported(): never {
  throw new Error('pdf.js 在微信小程序中不可用，PDF 解析走云函数 parsePdf');
}

export const GlobalWorkerOptions: { workerSrc: string } = { workerSrc: '' };
export const getDocument = notSupported;
export default { GlobalWorkerOptions, getDocument };
