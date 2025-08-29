// 测试游戏反馈功能
const testFeedback = async () => {
  const baseUrl = 'http://localhost:3000'
  
  // 测试用例 1: 内容太短（应该返回错误消息）
  console.log('测试用例 1: 内容太短')
  try {
    const response = await fetch(`${baseUrl}/api/patch/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patchId: 1,
        content: '短内容' // 只有 3 个字符，少于最小要求的 10 个字符
      })
    })
    
    const data = await response.json()
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))
    
    if (response.status === 400 && data.error === '反馈信息最少 10 个字符') {
      console.log('✅ 测试通过: 正确返回了友好的错误消息')
    } else {
      console.log('❌ 测试失败: 错误消息格式不正确')
    }
  } catch (error) {
    console.error('请求失败:', error)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // 测试用例 2: 内容太长（应该返回错误消息）
  console.log('测试用例 2: 内容太长')
  try {
    const longContent = 'a'.repeat(5001) // 超过最大长度 5000
    const response = await fetch(`${baseUrl}/api/patch/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patchId: 1,
        content: longContent
      })
    })
    
    const data = await response.json()
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))
    
    if (response.status === 400 && data.error === '反馈信息最多 5000 个字符') {
      console.log('✅ 测试通过: 正确返回了友好的错误消息')
    } else {
      console.log('❌ 测试失败: 错误消息格式不正确')
    }
  } catch (error) {
    console.error('请求失败:', error)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // 测试用例 3: 有效内容但未登录（应该返回未登录错误）
  console.log('测试用例 3: 有效内容但未登录')
  try {
    const response = await fetch(`${baseUrl}/api/patch/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patchId: 1,
        content: '这是一个有效的反馈内容，长度超过10个字符'
      })
    })
    
    const data = await response.json()
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))
    
    if (response.status === 401 && data.error === '用户未登录') {
      console.log('✅ 测试通过: 正确返回了未登录错误消息')
    } else {
      console.log('❌ 测试失败: 错误消息格式不正确')
    }
  } catch (error) {
    console.error('请求失败:', error)
  }
}

testFeedback().catch(console.error)