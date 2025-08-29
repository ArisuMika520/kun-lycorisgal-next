// 自定义 rehype 插件，用于添加代码语言标签
export function rehypeCodeLanguage() {
  return (tree: any) => {
    function visit(node: any) {
      if (node.type === 'element' && node.tagName === 'pre' && node.children && node.children.length > 0) {
        const codeElement = node.children[0]
        
        if (codeElement && codeElement.tagName === 'code' && codeElement.properties) {
          const className = codeElement.properties.className
          
          if (className && Array.isArray(className)) {
            const languageClass = className.find((cls: string) => cls.startsWith('language-'))
            
            if (languageClass) {
              const language = languageClass.replace('language-', '')
              
              // 添加 data-language 属性到 pre 元素
              if (!node.properties) {
                node.properties = {}
              }
              node.properties.dataLanguage = language
              
              // 确保 pre 元素也有正确的 class
              if (!node.properties.className) {
                node.properties.className = []
              }
              if (Array.isArray(node.properties.className)) {
                if (!node.properties.className.includes(languageClass)) {
                  node.properties.className.push(languageClass)
                }
              }
            }
          }
        }
      }
      
      // 递归处理子节点
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(visit)
      }
    }
    
    visit(tree)
  }
}