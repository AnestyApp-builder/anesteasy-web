const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const iconSvgPath = path.join(__dirname, '../public/icon.svg')
const publicPath = path.join(__dirname, '../public')
const themeColor = '#14b8a6' // Teal-500

// Tamanhos de ícones necessários
const iconSizes = [
  { size: 192, name: 'icon-192.png', maskable: true },
  { size: 512, name: 'icon-512.png', maskable: true },
  { size: 180, name: 'apple-touch-icon.png', maskable: false },
]

// Tamanhos de splash screens para iOS (width x height)
const splashScreens = [
  { width: 1290, height: 2796, name: 'apple-splash-1290-2796.png' }, // iPhone 14 Pro Max
  { width: 1284, height: 2778, name: 'apple-splash-1284-2778.png' }, // iPhone 13 Pro Max, 12 Pro Max
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688.png' }, // iPhone XS Max
  { width: 1179, height: 2556, name: 'apple-splash-1179-2556.png' }, // iPhone 14 Pro
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532.png' }, // iPhone 13 Pro, 13, 12 Pro, 12
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' }, // iPhone X, XS
  { width: 828, height: 1792, name: 'apple-splash-828-1792.png' },   // iPhone XR
  { width: 750, height: 1334, name: 'apple-splash-750-1334.png' },   // iPhone 8, 7, 6s
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' }, // iPad Pro 12.9"
]

async function createIcon(size, filename, maskable = false) {
  try {
    const outputPath = path.join(publicPath, filename)
    
    if (maskable) {
      // Para ícones maskable, adicionar padding (80% do ícone, 10% de padding em cada lado)
      const iconSize = Math.floor(size * 0.8)
      const padding = Math.floor(size * 0.1)
      
      // Criar um canvas com fundo transparente
      const canvas = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      
      // Criar o ícone redimensionado
      const icon = await sharp(iconSvgPath)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer()
      
      // Compositar o ícone no canvas com padding
      await canvas
        .composite([{
          input: icon,
          left: padding,
          top: padding
        }])
        .png()
        .toFile(outputPath)
      
      console.log(`✅ Criado: ${filename} (maskable, ${size}x${size})`)
    } else {
      // Para ícones normais, remover fundo escuro e aplicar fundo na cor do tema
      const backgroundColor = themeColor.replace('#', '')
      const r = parseInt(backgroundColor.substr(0, 2), 16)
      const g = parseInt(backgroundColor.substr(2, 2), 16)
      const b = parseInt(backgroundColor.substr(4, 2), 16)
      
      // Criar canvas com fundo na cor do tema
      const canvas = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r, g, b, alpha: 1 }
        }
      })
      
      // Criar o ícone redimensionado (90% do tamanho para dar um pouco de padding)
      const iconSize = Math.floor(size * 0.9)
      const padding = Math.floor(size * 0.05)
      
      // Processar o SVG para remover fundo escuro/preto
      // Primeiro, converter para PNG
      let icon = await sharp(iconSvgPath)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .ensureAlpha()
        .png()
        .toBuffer()
      
      // Processar o ícone para remover fundo escuro/preto
      // Abordagem: aumentar brilho e contraste para destacar elementos claros
      // e remover áreas muito escuras
      const finalIcon = await sharp(icon)
        .ensureAlpha()
        .modulate({
          brightness: 1.8, // Aumentar brilho para remover preto
          saturation: 1.3
        })
        .linear(1.5, -(50 * 1.5) + 50) // Aumentar contraste moderadamente
        .normalize() // Normalizar a imagem
        .png()
        .toBuffer()
      
      // Compositar o ícone processado no canvas com fundo colorido
      await canvas
        .composite([{
          input: finalIcon,
          left: padding,
          top: padding,
          blend: 'over' // Modo de mesclagem para manter transparências
        }])
        .png()
        .toFile(outputPath)
      
      console.log(`✅ Criado: ${filename} (${size}x${size} com fundo ${themeColor}, fundo escuro removido)`)
    }
  } catch (error) {
    console.error(`❌ Erro ao criar ${filename}:`, error.message)
  }
}

async function createSplashScreen(width, height, filename) {
  try {
    const outputPath = path.join(publicPath, filename)
    
    // Criar splash screen com fundo na cor do tema
    const backgroundColor = themeColor.replace('#', '')
    const r = parseInt(backgroundColor.substr(0, 2), 16)
    const g = parseInt(backgroundColor.substr(2, 2), 16)
    const b = parseInt(backgroundColor.substr(4, 2), 16)
    
    // Tamanho do ícone no splash (30% da altura, centralizado)
    const iconSize = Math.floor(height * 0.3)
    
    // Criar o canvas com fundo
    const canvas = sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r, g, b, alpha: 1 }
      }
    })
    
    // Criar o ícone
    const icon = await sharp(iconSvgPath)
      .resize(iconSize, iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer()
    
    // Centralizar o ícone
    const iconLeft = Math.floor((width - iconSize) / 2)
    const iconTop = Math.floor((height - iconSize) / 2)
    
    // Compositar o ícone no canvas
    await canvas
      .composite([{
        input: icon,
        left: iconLeft,
        top: iconTop
      }])
      .png()
      .toFile(outputPath)
    
    console.log(`✅ Criado: ${filename} (${width}x${height})`)
  } catch (error) {
    console.error(`❌ Erro ao criar splash ${filename}:`, error.message)
  }
}

async function generateAllIcons() {
  console.log('🎨 Iniciando geração de ícones PWA...\n')
  
  // Verificar se o SVG existe
  if (!fs.existsSync(iconSvgPath)) {
    console.error(`❌ Arquivo não encontrado: ${iconSvgPath}`)
    process.exit(1)
  }
  
  // Gerar ícones
  console.log('📱 Gerando ícones...')
  for (const icon of iconSizes) {
    await createIcon(icon.size, icon.name, false)
    if (icon.maskable) {
      await createIcon(icon.size, icon.name.replace('.png', '-maskable.png'), true)
    }
  }
  
  // Gerar splash screens
  console.log('\n🚀 Gerando splash screens...')
  for (const splash of splashScreens) {
    await createSplashScreen(splash.width, splash.height, splash.name)
  }
  
  console.log('\n✨ Geração de ícones concluída!')
  console.log('\n📋 Arquivos gerados:')
  console.log('   - Ícones: icon-192.png, icon-192-maskable.png, icon-512.png, icon-512-maskable.png')
  console.log('   - Apple Touch Icon: apple-touch-icon.png')
  console.log('   - Splash Screens: apple-splash-*.png')
}

generateAllIcons().catch(console.error)

