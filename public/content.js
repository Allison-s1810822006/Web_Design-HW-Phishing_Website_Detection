// 内容脚本 - 页面级别的钓鱼检测
(function() {
  'use strict';

  // 检测页面内容中的钓鱼指标
  function detectPhishingContent() {
    const pageText = document.body.innerText.toLowerCase();
    const pageTitle = document.title.toLowerCase();

    // 钓鱼网站常用的紧急性词汇
    const urgentPhrases = [
      '立即验证',
      '账户已暂停',
      '紧急通知',
      '马上行动',
      '限时优惠',
      '账户安全',
      '验证身份',
      '点击确认',
      'immediate action',
      'verify now',
      'account suspended',
      'urgent notice',
      'act now',
      'limited time',
      'security alert'
    ];

    // 检测表单中的敏感字段
    const sensitiveFields = document.querySelectorAll('input[type="password"], input[name*="password"], input[name*="ssn"], input[name*="credit"], input[name*="card"]');

    let suspiciousContent = 0;
    let warnings = [];

    // 检查紧急性词汇
    urgentPhrases.forEach(phrase => {
      if (pageText.includes(phrase) || pageTitle.includes(phrase)) {
        suspiciousContent += 10;
        warnings.push(`包含紧急性词汇: "${phrase}"`);
      }
    });

    // 检查是否有过多的敏感表单字段
    if (sensitiveFields.length > 3) {
      suspiciousContent += 20;
      warnings.push('页面包含过多敏感信息输入字段');
    }

    // 检测可疑的链接
    const links = document.querySelectorAll('a[href]');
    let externalLinks = 0;
    links.forEach(link => {
      const href = link.href.toLowerCase();
      if (href.includes('bit.ly') || href.includes('tinyurl') || href.includes('short.link')) {
        suspiciousContent += 15;
        warnings.push('包含可疑的短链接');
      }

      // 检查外部链接
      if (!href.includes(window.location.hostname) && (href.startsWith('http') || href.startsWith('https'))) {
        externalLinks++;
      }
    });

    // 如果外部链接过多也是可疑的
    if (externalLinks > links.length * 0.7) {
      suspiciousContent += 15;
      warnings.push('页面包含过多外部链接');
    }

    return { score: suspiciousContent, warnings: warnings };
  }

  // 监听表单提交，在提交敏感信息前再次警告
  function monitorFormSubmissions() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        const inputs = form.querySelectorAll('input[type="password"], input[name*="password"], input[name*="card"], input[name*="ssn"]');

        if (inputs.length > 0 && !window.location.protocol.includes('https')) {
          e.preventDefault();
          showSecurityWarning();
        }
      });
    });
  }

  // 显示安全警告
  function showSecurityWarning() {
    if (document.getElementById('security-warning-banner')) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'security-warning-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: #ff4444;
      color: white;
      padding: 15px;
      text-align: center;
      z-index: 999998;
      font-family: Arial, sans-serif;
      font-size: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;

    banner.innerHTML = `
      <strong>⚠️ 安全警告：</strong> 
      您即将在不安全的连接上提交敏感信息！这可能会被第三方截获。
      <button onclick="this.parentElement.remove()" style="
        background: white;
        color: #ff4444;
        border: none;
        padding: 5px 15px;
        margin-left: 15px;
        border-radius: 3px;
        cursor: pointer;
      ">关闭</button>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // 5秒后自动关闭
    setTimeout(() => {
      if (banner.parentElement) {
        banner.remove();
      }
    }, 5000);
  }

  // 页面加载完成后执行检测
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(() => {
        const contentAnalysis = detectPhishingContent();
        monitorFormSubmissions();

        // 如果内容分析发现问题，发送消息给背景脚本
        if (contentAnalysis.score > 20) {
          chrome.runtime.sendMessage({
            type: 'contentWarning',
            score: contentAnalysis.score,
            warnings: contentAnalysis.warnings,
            url: window.location.href
          });
        }
      }, 1000);
    });
  } else {
    setTimeout(() => {
      const contentAnalysis = detectPhishingContent();
      monitorFormSubmissions();

      if (contentAnalysis.score > 20) {
        chrome.runtime.sendMessage({
          type: 'contentWarning',
          score: contentAnalysis.score,
          warnings: contentAnalysis.warnings,
          url: window.location.href
        });
      }
    }, 1000);
  }

})();

