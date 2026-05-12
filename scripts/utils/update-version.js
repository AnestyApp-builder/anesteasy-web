#!/usr/bin/env node
/**
 * Script para atualizar version.json a cada build
 * Garante que o navegador sempre detecte uma nova versão
 */

const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '../public/version.json');

// Gerar informações da versão
const now = new Date();
const buildId = `build-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const versionInfo = {
  version: process.env.npm_package_version || '1.0.0',
  buildDate: now.toISOString(),
  buildId: buildId,
  buildTimestamp: Date.now(),
  environment: process.env.NODE_ENV || 'production'
};

// Escrever arquivo
fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));

console.log('✅ version.json atualizado:');
console.log(JSON.stringify(versionInfo, null, 2));
console.log('\n🔄 Esta versão será usada para cache busting automático');

