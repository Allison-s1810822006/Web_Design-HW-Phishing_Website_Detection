console.log("Background service worker started.");

chrome.runtime.onInstalled.addListener(() => {
  console.log('Phishing Detection extension installed.');
});

// 钓鱼网站检测背景脚本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面加载完成时检测
  if (changeInfo.status === 'complete' && tab.url) {
    checkPhishingWebsite(tab.url, tabId);
  }
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'contentWarning') {
    const tabId = sender.tab.id;
    const domain = new URL(request.url).hostname;

    // 结合URL检测和内容检测的结果
    const urlAnalysis = analyzeUrl(request.url);
    const combinedScore = urlAnalysis.riskScore + request.score;
    const combinedReasons = [...urlAnalysis.reasons, ...request.warnings];

    if (combinedScore >= 25) {
      showPhishingWarning(tabId, domain, combinedScore, combinedReasons);
    }
  }
});

// URL分析函数
function analyzeUrl(url) {
  const phishingKeywords = [
    'verify-account', 'secure-update', 'urgent-action', 'suspended-account',
    'click-here-now', 'limited-time', 'act-now', 'confirm-identity',
    'paypal-security', 'amazon-security', 'microsoft-security', 'google-security',
    'bank-verification'
  ];

  const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'short.link', 'ow.ly'];
  const legitimateDomains = ['paypal.com', 'amazon.com', 'microsoft.com', 'google.com', 'apple.com'];

  const domain = new URL(url).hostname.toLowerCase();
  const fullUrl = url.toLowerCase();

  let riskScore = 0;
  let reasons = [];

  // 检查可疑域名
  if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
    riskScore += 30;
    reasons.push('使用了短链接服务');
  }

  // 检查钓鱼关键词
  phishingKeywords.forEach(keyword => {
    if (fullUrl.includes(keyword)) {
      riskScore += 15;
      reasons.push(`包含可疑关键词: ${keyword}`);
    }
  });

  // 检查域名欺骗
  legitimateDomains.forEach(legitDomain => {
    if (domain.includes(legitDomain) && domain !== legitDomain) {
      riskScore += 40;
      reasons.push(`可能在模仿 ${legitDomain}`);
    }
  });

  // 检查HTTPS
  if (!url.startsWith('https://')) {
    riskScore += 20;
    reasons.push('未使用安全连接(HTTPS)');
  }

  // 检查IP地址
  const ipPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
  if (ipPattern.test(url)) {
    riskScore += 35;
    reasons.push('直接使用IP地址而非域名');
  }

  return { riskScore, reasons };
}

// 检测钓鱼网站的主函数
function checkPhishingWebsite(url, tabId) {
  const analysis = analyzeUrl(url);

  // 如果风险评分超过阈值，显示警告
  if (analysis.riskScore >= 25) {
    const domain = new URL(url).hostname;
    showPhishingWarning(tabId, domain, analysis.riskScore, analysis.reasons);
  }
}

// 显示钓鱼警告
function showPhishingWarning(tabId, domain, riskScore, reasons) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: createWarningModal,
    args: [domain, riskScore, reasons]
  });
}

// 注入到页面的警告模态框函数
function createWarningModal(domain, riskScore, reasons) {
  // 避免重复创建警告
  if (document.getElementById('phishing-warning-modal')) {
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'phishing-warning-modal';
  modal.className = 'phishing-warning-modal';

  const warningBox = document.createElement('div');
  warningBox.className = 'phishing-warning-box';

  const getRiskLevel = (score) => {
    if (score >= 60) return { level: '高危险', color: '#ff0000' };
    if (score >= 40) return { level: '中等危险', color: '#ff6600' };
    return { level: '低危险', color: '#ffaa00' };
  };

  const risk = getRiskLevel(riskScore);

  warningBox.innerHTML = `
    <div class="phishing-warning-icon">⚠️</div>
    <h2 class="phishing-warning-title">钓鱼网站警告</h2>
    <p class="phishing-warning-content">
      检测到当前网站 <strong>${domain}</strong> 可能是钓鱼网站
    </p>
    <div class="phishing-risk-info">
      <div class="phishing-risk-level" style="color: ${risk.color};">
        危险等级: ${risk.level} (${riskScore}分)
      </div>
      <div class="phishing-reasons">
        <strong>检测到的问题:</strong>
        <ul>
          ${reasons.map(reason => `<li>${reason}</li>`).join('')}
        </ul>
      </div>
    </div>
    <div class="phishing-advice">
      <div class="phishing-advice-title">🛡️ 安全建议:</div>
      • 不要在此网站输入个人信息或密码<br>
      • 检查网址是否正确拼写<br>
      • 如果这是银行或购物网站，请直接访问官方网站<br>
      • 当心要求紧急行动的内容<br>
      • 可以联系官方客服确认网站真实性
    </div>
    <div class="phishing-buttons">
      <button id="leave-site-btn" class="phishing-btn phishing-btn-danger">
        🚫 离开此网站
      </button>
      <button id="continue-anyway-btn" class="phishing-btn phishing-btn-secondary">
        ⚠️ 仍然继续 (不推荐)
      </button>
    </div>
  `;

  modal.appendChild(warningBox);
  document.body.appendChild(modal);

  // 添加事件监听器
  document.getElementById('leave-site-btn').onclick = () => {
    window.history.back();
  };

  document.getElementById('continue-anyway-btn').onclick = () => {
    modal.remove();
    document.body.style.overflow = '';
  };

  // 阻止页面滚动
  document.body.style.overflow = 'hidden';

  // 添加键盘事件监听
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.body.style.overflow = '';
    }
  });
}
