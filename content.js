// ===== 設定（與 popup 同步）=====
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

// ===== 規則字典 =====
const SUSPICIOUS_TLDS   = ["xyz","top","tk","gq","cf","ml","shop","click"];
const SUSPICIOUS_TOKENS = ["login","secure","verify","update","account","wallet","pay","reset","support"];

// ===== 小工具 =====
const normHost = h => (h||"").toLowerCase().trim().replace(/^www\./,"").replace(/\.$/,"");
const endsWithHost = (host, rule) => host === rule || host.endsWith("." + rule);
const topFrameOnly = () => { try { return window.top === window; } catch { return true; } };
const getCfg = () => new Promise(r => chrome.storage.sync.get(DEFAULTS, r));

function insertBanner(msg){
    if (!topFrameOnly()) return;
    if (document.getElementById("__phish_banner__")) return;
    const bar = document.createElement("div");
    bar.id = "__phish_banner__";
    bar.textContent = msg;
    bar.style.cssText = [
        "position:fixed","top:0","left:0","right:0","z-index:2147483647",
        "padding:12px 16px","font:14px/1.4 system-ui,Arial",
        "background:#ffcc00","color:#111","text-align:center","box-shadow:0 2px 6px rgba(0,0,0,.2)"
    ].join(";");
    document.documentElement?.appendChild(bar);
    document.documentElement.style.scrollPaddingTop = "56px";
}

// ===== 規則 =====
function looksSuspiciousHost(host){
    const tokenHit   = SUSPICIOUS_TOKENS.some(t => host.includes(t));     // 可疑字樣
    const homoglyph  = /[0-9]/.test(host) && /[o0l1]/i.test(host);        // 0/1 混用
    const tooManySub = host.split(".").length > 4;                         // 過多子網域

    // 修復TLD檢測邏輯 - 檢查是否為IP地址
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(host);
    if (isIP) return false; // IP地址不進行TLD檢測

    const parts = host.split(".");
    const tld = parts.length > 1 ? parts.pop() : "";
    const oddTld     = tld && SUSPICIOUS_TLDS.includes(tld);                   // 不常見 TLD
    return tokenHit || homoglyph || tooManySub || oddTld;
}
function hasSensitiveForm(){
    const pw  = document.querySelector("input[type='password']");
    const otp = document.querySelector("input[name*='otp' i]");
    const card= document.querySelector("input[name*='card' i], input[name*='cvv' i]");
    return !!(pw || otp || card);
}
function isHttp(){ return location.protocol === "http:"; }               // HTTP 風險

// 動態檢測敏感表單的函數
async function checkFormsAndWarn() {
    try {
        const cfg = await getCfg();
        if (!cfg.enabled) return;

        const host = normHost(location.hostname);

        // 白名單優先放行
        if (cfg.whitelist.some(w => endsWithHost(host, normHost(w)))) return;

        // 黑名單直接警示
        if (cfg.blacklist.some(b => endsWithHost(host, normHost(b)))){
            insertBanner("疑似釣魚：此網域在黑名單中，請勿輸入帳密或金流資料。若誤判請加入白名單。");
            return;
        }

        // HTTP + 敏感表單 → 警示
        if (isHttp() && hasSensitiveForm()){
            insertBanner("風險警示：此頁使用 HTTP 且含敏感輸入欄位，請勿輸入帳密或金流資料。");
            return;
        }

        // 可疑網域樣態 + 敏感表單 → 警示
        if (looksSuspiciousHost(host) && hasSensitiveForm()){
            insertBanner("風險警示：此網域樣態可疑且含敏感輸入欄位，請勿輸入帳密或金流資料。");
        }
    } catch (error) {
        console.error('Phishing detection error:', error);
    }
}

// ===== 主流程 =====
(async function main(){
    try {
        // 初始檢查
        await checkFormsAndWarn();

        // 監聽DOM變化，檢測動態載入的表單
        const observer = new MutationObserver(() => {
            checkFormsAndWarn();
        });

        // 確保document.body存在後才開始觀察
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            // 如果body還沒載入，等待DOM載入
            document.addEventListener('DOMContentLoaded', () => {
                checkFormsAndWarn();
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }

        // 頁面載入完成後再檢查一次
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkFormsAndWarn);
        }
    } catch (error) {
        console.error('Phishing detection initialization error:', error);
    }
})();
