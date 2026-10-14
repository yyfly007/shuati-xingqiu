// mock: parsePdf —— Web 预览端在浏览器里用 pdf.js 解析 PDF（微信小程序端走云函数 parsePdf）
const WORKER_CDNS = [
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs',
  'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs',
];

export default async (data: { base64?: string; fileName?: string }): Promise<{ text: string }> => {
  if (!data || !data.base64) throw new Error('缺少文件内容');
  const binary = atob(data.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // @ts-ignore pdf.js 子路径无类型声明
  const pdfjs: any = await import('pdfjs-dist/build/pdf.mjs');
  let lastErr: unknown = null;
  for (const workerSrc of WORKER_CDNS) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      let text = '';
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        for (const item of content.items as any[]) {
          if (item && typeof item.str === 'string') {
            text += item.str;
            if (item.hasEOL) text += '\n';
          }
        }
        text += '\n';
      }
      await doc.destroy();
      if (!text.trim()) throw new Error('未提取到文字（可能是扫描件/图片 PDF，请先转成文字版）');
      return { text };
    } catch (e) {
      lastErr = e;
    }
  }
  console.error('[mock parsePdf] failed:', lastErr);
  throw new Error('PDF 解析失败：无法加载解析引擎，请在微信小程序中使用 PDF 导入');
};
