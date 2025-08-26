import { execSync } from 'child_process'
import { copyFileSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔨 構建Chrome擴展...')

// 1. 構建Vue應用
console.log('📦 構建Vue應用...')
execSync('npm run build', { stdio: 'inherit' })

// 2. 複製構建文件到public目錄
console.log('📋 複製文件到擴展目錄...')
copyFileSync(join(__dirname, 'dist/popup.js'), join(__dirname, 'public/popup.js'))
copyFileSync(join(__dirname, 'dist/popup.css'), join(__dirname, 'public/popup.css'))

// 3. 修改popup.html文件以適配Chrome擴展
console.log('🔧 修復popup.html路徑...')
let htmlContent = readFileSync(join(__dirname, 'dist/index.html'), 'utf8')

// 修復路徑問題
htmlContent = htmlContent
  .replace(/href="\/favicon\.ico"/g, 'href="favicon.ico"')
  .replace(/src="\/popup\.js"/g, 'src="popup.js"')
  .replace(/href="\/popup\.css"/g, 'href="popup.css"')

// 確保包含CSS鏈接
if (!htmlContent.includes('popup.css')) {
  htmlContent = htmlContent.replace(
    '<title>釣魚網站檢測器</title>',
    '<title>釣魚網站檢測器</title>\n    <link rel="stylesheet" crossorigin href="popup.css">'
  )
}

writeFileSync(join(__dirname, 'public/popup.html'), htmlContent)

console.log('✅ Chrome擴展構建完成!')
console.log('📁 擴展文件位於: public/ 目錄')
console.log('🚀 現在可以在Chrome中加載擴展了!')
