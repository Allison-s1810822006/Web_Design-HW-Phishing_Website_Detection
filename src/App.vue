<script setup>
import { ref, onMounted, computed } from 'vue'

const currentUrl = ref('')
const siteStatus = ref('checking') // 'safe', 'warning', 'danger', 'checking'
const isScanning = ref(false)
const riskScore = ref(0)

const statusClass = computed(() => {
  switch (siteStatus.value) {
    case 'safe': return 'safe'
    case 'warning': return 'warning'
    case 'danger': return 'danger'
    default: return ''
  }
})

const statusIcon = computed(() => {
  switch (siteStatus.value) {
    case 'safe': return '✅'
    case 'warning': return '⚠️'
    case 'danger': return '❌'
    default: return '🔍'
  }
})

const statusText = computed(() => {
  switch (siteStatus.value) {
    case 'safe': return `安全 (风险评分: ${riskScore.value})`
    case 'warning': return `可疑 (风险评分: ${riskScore.value})`
    case 'danger': return `危险 (风险评分: ${riskScore.value})`
    default: return '检测中...'
  }
})

onMounted(async () => {
  await getCurrentTab()
  await performScan()
})

async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url) {
      currentUrl.value = tab.url
    }
  } catch (error) {
    console.error('获取当前标签页失败:', error)
    currentUrl.value = '无法获取当前网站'
  }
}

async function performScan() {
  if (!currentUrl.value || currentUrl.value === '无法获取当前网站') return

  isScanning.value = true
  siteStatus.value = 'checking'

  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (tab?.id) {
      // 向content script发送检测请求
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectPhishing' })

      if (response) {
        riskScore.value = response.riskScore || 0

        if (riskScore.value >= 60) {
          siteStatus.value = 'danger'
        } else if (riskScore.value >= 40) {
          siteStatus.value = 'warning'
        } else {
          siteStatus.value = 'safe'
        }
      }
    }
  } catch (error) {
    console.error('检测失败:', error)
    siteStatus.value = 'safe'
    riskScore.value = 0
  } finally {
    isScanning.value = false
  }
}

function openSettings() {
  // 打开设置页面或帮助文档
  chrome.tabs.create({
    url: 'https://github.com/your-repo/phishing-detector#usage'
  })
}
</script>

<template>
  <div class="popup-container">
    <div class="header">
      <div class="logo">🛡️</div>
      <h1 class="title">钓鱼网站检测器</h1>
    </div>

    <div class="current-site">
      <div class="site-url">{{ currentUrl || '正在获取当前网站...' }}</div>
      <div class="status" :class="statusClass">
        <span class="status-icon">{{ statusIcon }}</span>
        <span>{{ statusText }}</span>
      </div>
    </div>

    <button
      class="scan-button"
      @click="performScan"
      :disabled="isScanning"
    >
      <span v-if="!isScanning">重新扫描</span>
      <span v-else class="loading-container">
        <span class="spinner"></span>
        <span>扫描中...</span>
      </span>
    </button>

    <div class="features">
      <div class="feature">
        <span class="feature-icon">⚡</span>
        <span>实时自动检测</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🔒</span>
        <span>安全连接验证</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🎯</span>
        <span>智能内容分析</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📊</span>
        <span>风险评分系统</span>
      </div>
    </div>

    <div class="settings">
      <a href="#" class="settings-link" @click="openSettings">设置和帮助</a>
    </div>
  </div>
</template>

<style scoped>
.popup-container {
  width: 350px;
  min-height: 400px;
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 25px;
}

.logo {
  font-size: 32px;
  margin-bottom: 10px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.current-site {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
  backdrop-filter: blur(10px);
}

.site-url {
  font-size: 14px;
  word-break: break-all;
  margin-bottom: 10px;
  opacity: 0.9;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.status-icon {
  font-size: 16px;
}

.safe { color: #4CAF50; }
.warning { color: #FF9800; }
.danger { color: #f44336; }

.scan-button {
  width: 100%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 15px 0;
}

.scan-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.scan-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.features {
  margin-top: 20px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
  font-size: 14px;
  opacity: 0.9;
}

.feature-icon {
  font-size: 16px;
}

.settings {
  margin-top: 25px;
  text-align: center;
}

.settings-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.settings-link:hover {
  color: white;
  text-decoration: underline;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
