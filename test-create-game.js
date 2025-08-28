// 简化的测试脚本，直接测试API端点
// Node.js 18+ 内置了 fetch

// 创建一个简单的测试图片
const createTestImage = () => {
  // 创建一个简单的1x1像素的PNG图片的ArrayBuffer
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // image data
    0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ])
  return pngData.buffer
}

const testCreateGame = async () => {
  try {
    console.log('开始测试创建游戏API...')
    
    // 创建FormData
    const formData = new FormData()
    formData.append('name', '测试游戏')
    formData.append('vndbId', '')
    formData.append('alias', JSON.stringify(['测试别名']))
    formData.append('tag', JSON.stringify(['测试标签']))
    formData.append('introduction', '这是一个测试游戏的介绍')
    formData.append('released', '2024-01-01')
    formData.append('contentLimit', 'sfw')
    
    // 创建测试图片Blob
    const imageBuffer = createTestImage()
    const blob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('banner', blob, 'test.png')
    
    const response = await fetch('http://127.0.0.1:3000/api/edit', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    
    const result = await response.text()
    console.log('响应状态:', response.status)
    console.log('响应内容:', result)
    
    if (!response.ok) {
      console.error('API请求失败:', response.status, result)
    } else {
      console.log('API请求成功')
    }
  } catch (error) {
    console.error('测试过程中发生错误:', error)
    console.error('错误堆栈:', error.stack)
  }
}

testCreateGame()