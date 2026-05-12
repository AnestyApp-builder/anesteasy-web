#!/usr/bin/env node
/**
 * Script para limpar cache local (desenvolvimento)
 * Este script é útil para desenvolvedores testarem o comportamento do cache
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Limpando cache local...\n');

// Limpar .next
const nextDir = path.join(__dirname, '../.next');
if (fs.existsSync(nextDir)) {
  console.log('🗑️  Removendo diretório .next...');
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ .next removido');
} else {
  console.log('⏭️  .next não existe, pulando...');
}

// Limpar node_modules/.cache
const cacheDir = path.join(__dirname, '../node_modules/.cache');
if (fs.existsSync(cacheDir)) {
  console.log('🗑️  Removendo cache do node_modules...');
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Cache do node_modules removido');
} else {
  console.log('⏭️  Cache do node_modules não existe, pulando...');
}

console.log('\n✨ Cache local limpo com sucesso!');
console.log('💡 Execute "npm run build" para recriar o build');

