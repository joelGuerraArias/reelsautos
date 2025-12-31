// Script para verificar que todo esté configurado correctamente
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando configuración del sistema...\n');

// 1. Verificar FFmpeg
console.log('1️⃣ Verificando FFmpeg...');
try {
  const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf8' });
  const versionLine = ffmpegVersion.split('\n')[0];
  console.log(`   ✅ FFmpeg instalado: ${versionLine}`);
} catch (error) {
  console.log('   ❌ FFmpeg NO está instalado o no está en el PATH');
  console.log('   📥 Descarga FFmpeg de: https://ffmpeg.org/download.html');
  process.exit(1);
}

// 2. Verificar fuentes en Windows
if (process.platform === 'win32') {
  console.log('\n2️⃣ Verificando fuentes en Windows...');
  const fontPath = 'C:/Windows/Fonts/arial.ttf';
  if (fs.existsSync(fontPath)) {
    console.log(`   ✅ Fuente Arial encontrada: ${fontPath}`);
  } else {
    console.log(`   ❌ Fuente Arial NO encontrada en: ${fontPath}`);
  }
  
  // Verificar alternativas
  const alternatives = [
    'C:/Windows/Fonts/calibri.ttf',
    'C:/Windows/Fonts/verdana.ttf',
    'C:/Windows/Fonts/tahoma.ttf'
  ];
  
  console.log('   🔍 Buscando fuentes alternativas...');
  for (const altFont of alternatives) {
    if (fs.existsSync(altFont)) {
      console.log(`   ✅ Alternativa encontrada: ${altFont}`);
    }
  }
}

// 3. Verificar directorios
console.log('\n3️⃣ Verificando directorios...');
const dirs = [
  './uploads/photos',
  './uploads/audios',
  './uploads/videos',
  './uploads/logos',
  './uploads/background_music',
  './uploads/uploaded_videos',
  './temp_video'
];

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    console.log(`   ✅ ${dir} (${files.length} archivos)`);
  } else {
    console.log(`   ⚠️  ${dir} no existe (se creará automáticamente)`);
  }
}

// 4. Verificar Node.js
console.log('\n4️⃣ Versión de Node.js:');
console.log(`   ✅ ${process.version}`);

// 5. Verificar espacio en disco
console.log('\n5️⃣ Verificando espacio en disco...');
try {
  const stats = fs.statfsSync ? fs.statfsSync('.') : null;
  if (stats) {
    const freeSpaceGB = (stats.bavail * stats.bsize / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`   ✅ Espacio libre: ${freeSpaceGB} GB`);
    if (parseFloat(freeSpaceGB) < 1) {
      console.log(`   ⚠️  Advertencia: Menos de 1GB libre`);
    }
  }
} catch (e) {
  console.log('   ⚠️  No se pudo verificar espacio en disco');
}

// 6. Probar comando FFmpeg simple
console.log('\n6️⃣ Probando comando FFmpeg de prueba...');
try {
  execSync('ffmpeg -version > nul 2>&1', { stdio: 'ignore' });
  console.log('   ✅ FFmpeg responde correctamente');
} catch (error) {
  console.log('   ❌ FFmpeg no responde');
}

console.log('\n✅ Verificación completada!\n');
console.log('📝 Si todo está marcado con ✅, el sistema está listo.');
console.log('🚀 Ejecuta: npm run dev para iniciar el servidor\n');



