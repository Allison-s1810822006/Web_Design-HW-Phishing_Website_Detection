console.log("Content script loaded for Phishing Detection.");

// Phishing Detection Content Script

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

// 當頁面完全載入後執行檢查
window.addEventListener("load", checkPageSecurity);