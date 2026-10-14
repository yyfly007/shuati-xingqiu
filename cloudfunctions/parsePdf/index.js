const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const pdfParse = require('pdf-parse');

exports.main = async (event, context) => {
  try {
    const { fileID } = event;
    if (!fileID) {
      return { code: -1, message: '缺少 fileID', data: null };
    }
    const res = await cloud.downloadFile({ fileID });
    if (!res || !res.fileContent) {
      return { code: -1, message: '文件下载失败', data: null };
    }
    const data = await pdfParse(res.fileContent);
    const text = (data.text || '').trim();
    if (!text) {
      return { code: -1, message: '未提取到文字（可能是扫描件/图片 PDF，请先转成文字版）', data: null };
    }
    return { code: 0, message: 'success', data: { text } };
  } catch (err) {
    console.error('parsePdf failed', err);
    return { code: -1, message: err.message || 'PDF 解析失败', data: null };
  }
};
