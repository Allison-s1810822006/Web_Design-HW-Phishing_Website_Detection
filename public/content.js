console.log("Content script loaded for Phishing Detection.");

// Phishing Detection Content Script

function calculateRiskScore() {
    let riskScore = 0;
    const risks = [];

    // 檢查 HTTP vs HTTPS
    if (window.location.protocol !== "https:") {
        riskScore += 20;
        risks.push("使用不安全的 HTTP 連線");
    }

    // 檢查密碼欄位
    const passwordFields = document.querySelectorAll('input[type="password"]');
    if (passwordFields.length > 0 && window.location.protocol !== "https:") {
        riskScore += 25;
        risks.push("在不安全連線上要求密碼");
    }

    // 檢查可疑關鍵字
    const suspiciousKeywords = ['urgent', 'verify', 'suspended', 'click here', 'act now', 'limited time', 'winner', 'congratulations'];
    const pageText = document.body.innerText.toLowerCase();
    suspiciousKeywords.forEach(keyword => {
        if (pageText.includes(keyword)) {
            riskScore += 5;
            risks.push(`包含可疑關鍵字: ${keyword}`);
        }
    });

    // 檢查不安全連結
    const links = document.querySelectorAll('a');
    let insecureLinksCount = 0;
    links.forEach(link => {
        if (link.href && link.protocol === "http:") {
            insecureLinksCount++;
        }
    });

    if (insecureLinksCount > 0) {
        riskScore += Math.min(insecureLinksCount * 3, 15);
        risks.push(`包含 ${insecureLinksCount} 個不安全連結`);
    }

    // 檢查網域名稱可疑性
    const hostname = window.location.hostname;
    if (hostname.includes('-') && hostname.split('-').length > 3) {
        riskScore += 10;
        risks.push("網域名稱包含過多連字符");
    }

    // 檢查是否有彈窗或緊急提示
    const popupWords = ['alert', 'warning', 'error', 'virus', 'malware'];
    popupWords.forEach(word => {
        if (pageText.includes(word)) {
            riskScore += 8;
        }
    });

    return {
        riskScore: Math.min(riskScore, 100),
        risks: risks
    };
}

function checkPageSecurity() {
    // --- 原始功能：檢查當前頁面是否為 HTTP 且有密碼欄位 ---
    const passwordFields = document.querySelectorAll('input[type="password"]');
    if (passwordFields.length > 0 && window.location.protocol !== "https:") {
        console.warn("Phishing Risk: Password field found on an insecure (HTTP) page.");
        alert(`！！！頁面安全警告！！！\n\n此網站使用不安全的 HTTP 連線，且正在要求您輸入密碼。\n\n在此提交資訊可能會有風險。`);
    }

    // --- 新功能：檢查頁面中所有連結是否為 HTTPS ---
    const links = document.querySelectorAll('a');
    let insecureLinksFound = false;
    links.forEach(link => {
        // 檢查 href 屬性存在且開頭為 "http:" (而非 "https:")
        if (link.href && link.protocol === "http:") {
            insecureLinksFound = true;
            console.warn('Insecure link found:', link.href);
            // 為不安全的連結加上紅色樣式，使其更醒目
            link.style.border = '2px solid red';
            link.style.padding = '2px';
        }
    });

    if (insecureLinksFound) {
        alert(`！！！連結安全警告！！！\n\n此頁面包含前往不安全 (HTTP) 網站的連結。\n\n點擊這些連結時請格外小心。`);
    }
}

// 監聽來自popup的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectPhishing') {
        console.log('收到釣魚檢測請求');

        try {
            const result = calculateRiskScore();
            console.log('檢測結果:', result);

            sendResponse({
                riskScore: result.riskScore,
                risks: result.risks,
                url: window.location.href
            });
        } catch (error) {
            console.error('檢測過程中發生錯誤:', error);
            sendResponse({
                riskScore: 0,
                risks: ['檢測失敗'],
                url: window.location.href
            });
        }

        return true; // 保持訊息通道開放
    }
});

// 當頁面完全載入後執行檢查
window.addEventListener("load", checkPageSecurity);