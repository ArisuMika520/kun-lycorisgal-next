export const markdownToText = (markdown: string) => {
  return markdown
    // 移除代码块
    .replace(/```[\s\S]*?```/g, '')
    // 移除行内代码
    .replace(/`([^`]*)`/g, '$1')
    // 移除链接，保留文本
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // 移除图片
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
    // 移除粗体
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    // 移除斜体
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // 移除删除线
    .replace(/~~(.*?)~~/g, '$1')
    // 移除标题标记
    .replace(/^\s*(#{1,6})\s+(.*)/gm, '$2')
    // 移除引用块标记
    .replace(/^\s*>\s*/gm, '')
    // 移除水平线
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '')
    // 移除列表标记
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, '')
    // 移除HTML标签
    .replace(/<[^>]*>/g, '')
    // 移除多余的换行
    .replace(/\n{2,}/g, '\n')
    // 移除首尾空白
    .trim()
}
