import { execSync } from 'child_process'
import { copyFileSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔨 构建Chrome扩展...')

// 1. 构建Vue应用
console.log('📦 构建Vue应用...')
execSync('npm run build', { stdio: 'inherit' })

// 2. 复制构建文件到public目录
console.log('📋 复制文件到扩展目录...')
copyFileSync(join(__dirname, 'dist/popup.js'), join(__dirname, 'public/popup.js'))
copyFileSync(join(__dirname, 'dist/popup.css'), join(__dirname, 'public/popup.css'))

// 3. 修改popup.html文件以适配Chrome扩展
console.log('🔧 修复popup.html路径...')
let htmlContent = readFileSync(join(__dirname, 'dist/index.html'), 'utf8')

// 修复路径问题
htmlContent = htmlContent
  .replace(/href="\/favicon\.ico"/g, 'href="favicon.ico"')
  .replace(/src="\/popup\.js"/g, 'src="popup.js"')
  .replace(/href="\/popup\.css"/g, 'href="popup.css"')

// 确保包含CSS链接
if (!htmlContent.includes('popup.css')) {
  htmlContent = htmlContent.replace(
    '<title>钓鱼网站检测器</title>',
    '<title>钓鱼网站检测器</title>\n    <link rel="stylesheet" crossorigin href="popup.css">'
  )
}

writeFileSync(join(__dirname, 'public/popup.html'), htmlContent)

console.log('✅ Chrome扩展构建完成!')
console.log('📁 扩展文件位于: public/ 目录')
console.log('🚀 现在可以在Chrome中加载扩展了!')
