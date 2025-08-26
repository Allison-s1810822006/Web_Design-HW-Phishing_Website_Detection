const enabled = document.getElementById("enabled");
const blacklist = document.getElementById("blacklist");
const whitelist = document.getElementById("whitelist");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

// DEFAULTS should be defined here as it's not shared from content.js
const DEFAULTS = {
    enabled: true,
    blacklist: [
        "login-secure-now.com",
        "verify-account-alert.net",
        "secure-update-paypal.help"
    ],
    whitelist: [
        "google.com",
        "facebook.com",
        "youtube.com",
        "wikipedia.org"
    ]
};

// 引入 punycode 處理國際化網域
function toPunycode(domain) {
    try {
        // 只轉換含非 ASCII 字元的 domain
        if (/[^\x00-\x7F]/.test(domain)) {
            // 使用瀏覽器內建 URL 物件轉 punycode
            const url = new URL('http://' + domain);
            return url.hostname;
        }
    } catch (e) {}
    return null;
}

function load() {
    chrome.storage.sync.get(DEFAULTS, (cfg) => {
        enabled.checked = cfg.enabled;
        blacklist.value = cfg.blacklist.join("\n");
        whitelist.value = cfg.whitelist.join("\n");
    });
}

function reset() {
    chrome.storage.sync.set(DEFAULTS, () => {
        load(); // 重新載入預設值
        showStatus("已重設為預設值！");
    });
}

function save() {
    const processList = (text) => {
        const domains = text.split(/\s+/).filter(Boolean);
        const processedDomains = new Set();

        domains.forEach(domain => {
            const lower = domain.toLowerCase();
            processedDomains.add(lower);
            // 加入 punycode 形式（如有）
            const puny = toPunycode(lower);
            if (puny && puny !== lower) {
                processedDomains.add(puny);
            }
            try {
                const a = document.createElement('a');
                a.href = 'http://' + lower;
                if (a.hostname && a.hostname !== lower) {
                    processedDomains.add(a.hostname);
                    // 也處理 a.hostname 的 punycode
                    const puny2 = toPunycode(a.hostname);
                    if (puny2 && puny2 !== a.hostname) {
                        processedDomains.add(puny2);
                    }
                }
            } catch (e) {
                // Ignore conversion errors
            }
        });

        return Array.from(processedDomains);
    };

    const cfg = {
        enabled: enabled.checked,
        blacklist: processList(blacklist.value),
        whitelist: processList(whitelist.value)
    };

    chrome.storage.sync.set(cfg, () => {
        load(); // Reload lists to show the processed domains
        showStatus("已儲存！");
    });
}

function showStatus(message) {
    // 如果status元素不存在，創建一個
    let statusElement = document.getElementById("status");
    if (!statusElement) {
        statusElement = document.createElement("p");
        statusElement.id = "status";
        statusElement.style.cssText = "color: green; font-weight: bold; margin: 8px 0;";
        document.querySelector('.buttons').parentNode.insertBefore(statusElement, document.querySelector('.hint'));
    }

    statusElement.textContent = message;
    setTimeout(() => (statusElement.textContent = ""), 2000);
}

document.addEventListener("DOMContentLoaded", load);
saveBtn.addEventListener("click", save);

// 添加reset按鈕事件處理器
const resetBtn = document.getElementById("reset");
if (resetBtn) {
    resetBtn.addEventListener("click", reset);
}

// 彈窗頁面的JavaScript邏輯
document.addEventListener('DOMContentLoaded', function() {
    const currentUrlElement = document.getElementById('currentUrl');
    const siteStatusElement = document.getElementById('siteStatus');
    const scanButton = document.getElementById('scanButton');
    const scanText = document.getElementById('scanText');
    const scanSpinner = document.getElementById('scanSpinner');

    let currentTab = null;

    // 獲取當前活動標籤頁
    async function getCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0];
    }

    // 檢測網站安全性
    function analyzeWebsite(url) {
        const phishingKeywords = [
            'verify-account', 'secure-update', 'urgent-action', 'suspended-account',
            'click-here-now', 'limited-time', 'act-now', 'confirm-identity',
            'paypal-security', 'amazon-security', 'microsoft-security', 'google-security',
            'bank-verification', '立即驗證', '賬戶已暫停', '緊急通知', '馬上行動'
        ];

        const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'short.link', 'ow.ly'];
        const legitimateDomains = ['paypal.com', 'amazon.com', 'microsoft.com', 'google.com', 'apple.com'];

        const domain = new URL(url).hostname.toLowerCase();
        const fullUrl = url.toLowerCase();

        let riskScore = 0;
        let reasons = [];

        // 檢查可疑域名
        if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
            riskScore += 30;
            reasons.push('使用了短鏈接服務');
        }

        // 檢查釣魚關鍵詞
        phishingKeywords.forEach(keyword => {
            if (fullUrl.includes(keyword)) {
                riskScore += 15;
                reasons.push(`包含可疑關鍵詞: ${keyword}`);
            }
        });

        // 檢查域名欺騙
        legitimateDomains.forEach(legitDomain => {
            if (domain.includes(legitDomain) && domain !== legitDomain) {
                riskScore += 40;
                reasons.push(`可能在模仿 ${legitDomain}`);
            }
        });

        // 檢查HTTPS
        if (!url.startsWith('https://')) {
            riskScore += 20;
            reasons.push('未使用安全連接(HTTPS)');
        }

        // 檢查IP地址
        const ipPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
        if (ipPattern.test(url)) {
            riskScore += 35;
            reasons.push('直接使用IP地址而非域名');
        }

        return { riskScore, reasons, domain };
    }

    // 更新狀態顯示
    function updateStatus(analysis) {
        const { riskScore, reasons, domain } = analysis;

        let statusClass, statusIcon, statusText;

        if (riskScore >= 40) {
            statusClass = 'danger';
            statusIcon = '⚠️';
            statusText = `高風險 (${riskScore}分)`;
        } else if (riskScore >= 20) {
            statusClass = 'warning';
            statusIcon = '⚠️';
            statusText = `中等風險 (${riskScore}分)`;
        } else {
            statusClass = 'safe';
            statusIcon = '✅';
            statusText = '安全';
        }

        siteStatusElement.innerHTML = `
            <span class="status-icon">${statusIcon}</span>
            <span class="${statusClass}">${statusText}</span>
        `;

        // 如果有風險，顯示詳細信息
        if (riskScore > 0 && reasons.length > 0) {
            const detailsDiv = document.createElement('div');
            detailsDiv.style.cssText = `
                margin-top: 10px;
                font-size: 12px;
                opacity: 0.8;
                text-align: left;
            `;
            detailsDiv.innerHTML = `
                <strong>檢測到的問題:</strong><br>
                ${reasons.slice(0, 3).map(reason => `• ${reason}`).join('<br>')}
                ${reasons.length > 3 ? '<br>• ...' : ''}
            `;
            siteStatusElement.appendChild(detailsDiv);
        }
    }

    // 執行掃描
    async function performScan() {
        if (!currentTab || !currentTab.url) return;

        // 顯示載入狀態
        scanText.style.display = 'none';
        scanSpinner.style.display = 'inline-block';
        scanButton.disabled = true;

        try {
            // 模擬掃描延遲
            await new Promise(resolve => setTimeout(resolve, 1000));

            const analysis = analyzeWebsite(currentTab.url);
            updateStatus(analysis);

            // 保存掃描結果
            await chrome.storage.local.set({
                [`scan_${currentTab.url}`]: {
                    timestamp: Date.now(),
                    analysis: analysis
                }
            });

        } catch (error) {
            console.error('掃描失敗:', error);
            siteStatusElement.innerHTML = `
                <span class="status-icon">❌</span>
                <span class="danger">掃描失敗</span>
            `;
        } finally {
            // 恢復按鈕狀態
            scanText.style.display = 'inline';
            scanSpinner.style.display = 'none';
            scanButton.disabled = false;
        }
    }

    // 初始化頁面
    async function initialize() {
        try {
            currentTab = await getCurrentTab();

            if (currentTab && currentTab.url) {
                // 顯示當前URL
                const domain = new URL(currentTab.url).hostname;
                currentUrlElement.textContent = domain;

                // 檢查是否有快取的掃描結果
                const cached = await chrome.storage.local.get([`scan_${currentTab.url}`]);
                const cachedData = cached[`scan_${currentTab.url}`];

                if (cachedData && (Date.now() - cachedData.timestamp) < 300000) { // 5分鐘快取
                    updateStatus(cachedData.analysis);
                } else {
                    // 執行新的掃描
                    const analysis = analyzeWebsite(currentTab.url);
                    updateStatus(analysis);
                }
            } else {
                currentUrlElement.textContent = '無法獲取當前網站信息';
                siteStatusElement.innerHTML = `
                    <span class="status-icon">❓</span>
                    <span>未知</span>
                `;
            }
        } catch (error) {
            console.error('初始化失敗:', error);
            currentUrlElement.textContent = '初始化失敗';
        }
    }

    // 事件監聽器
    scanButton.addEventListener('click', performScan);

    document.getElementById('settingsLink').addEventListener('click', function(e) {
        e.preventDefault();
        // 打開選項頁面或幫助頁面
        chrome.tabs.create({
            url: 'https://github.com/your-repo/phishing-detector/wiki'
        });
    });

    // 初始化
    initialize();
});
