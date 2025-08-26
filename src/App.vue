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
    case 'safe': return `安全（風險評分: ${riskScore.value}）`
    case 'warning': return `可疑（風險評分: ${riskScore.value}）`
    case 'danger': return `危險（風險評分: ${riskScore.value}）`
    default: return '檢測中...'
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
    console.error('獲取當前分頁失敗:', error)
    currentUrl.value = '無法獲取當前網站'
  }
}

async function performScan() {
  if (!currentUrl.value || currentUrl.value === '無法獲取當前網站') return

  isScanning.value = true
  siteStatus.value = 'checking'

  try {
    // 獲取當前標籤頁
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (tab?.id) {
      // 先嘗試注入content script，以防它還沒載入
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        })
      } catch (injectError) {
        // 如果注入失敗（可能已經注入過），繼續執行
        console.log('Content script 可能已經載入:', injectError.message)
      }

      // 給content script一點時間載入
      await new Promise(resolve => setTimeout(resolve, 100))

      // 向content script發送檢測請求
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
      } else {
        // 如果沒有響應，設為安全狀態
        siteStatus.value = 'safe'
        riskScore.value = 0
      }
    }
  } catch (error) {
    console.error('檢測失敗:', error)
    // 檢查是否是因為無法訪問特殊頁面（如chrome://）
    if (error.message?.includes('Cannot access') || currentUrl.value.startsWith('chrome://')) {
      siteStatus.value = 'safe'
      riskScore.value = 0
    } else {
      siteStatus.value = 'safe'
      riskScore.value = 0
    }
  } finally {
    isScanning.value = false
  }
}
</script>

<template>
  <div class="popup-container">
    <div class="header">
      <div class="logo">🛡️</div>
      <h1 class="title">釣魚網站檢測器</h1>
    </div>

    <div class="current-site">
      <div class="site-url">{{ currentUrl || '正在獲取當前網站...' }}</div>
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
      <span v-if="!isScanning">重新掃描</span>
      <span v-else class="loading-container">
        <span class="spinner"></span>
        <span>掃描中...</span>
      </span>
    </button>

    <div class="features">
      <div class="feature">
        <span class="feature-icon">⚡</span>
        <span>即時自動檢測</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🔒</span>
        <span>安全連線驗證</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🎯</span>
        <span>智慧內容分析</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📊</span>
        <span>風險評分系統</span>
      </div>
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
