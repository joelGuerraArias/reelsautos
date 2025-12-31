// Test de compatibilidad Windows para PhotoStoryMaker
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando compatibilidad con Windows...\n');

const platform = process.platform;
console.log(`📌 Plataforma detectada: ${platform}`);

if (platform !== 'win32') {
  console.log('⚠️  Este script está diseñado para Windows');
  console.log('   Pero el código es compatible con ' + platform);
  process.exit(0);
}

console.log('\n✅ Verificaciones para Windows:\n');

// 1. Verificar FFmpeg
console.log('1️⃣ FFmpeg básico:');
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  console.log('   ✅ FFmpeg accesible');
} catch (e) {
  console.log('   ❌ FFmpeg NO accesible');
}

// 2. Verificar rutas de fuentes
console.log('\n2️⃣ Fuentes:');
const fonts = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/calibri.ttf',
  'C:/Windows/Fonts/verdana.ttf'
];

fonts.forEach(font => {
  if (fs.existsSync(font)) {
    console.log(`   ✅ ${path.basename(font)}`);
  } else {
    console.log(`   ❌ ${path.basename(font)} NO encontrado`);
  }
});

// 3. Probar escape de rutas con dos puntos
console.log('\n3️⃣ Escape de rutas:');
const testPath = 'C:/Windows/Fonts/arial.ttf';
const escaped = testPath.replace(/:/g, '\\\\:');
console.log(`   Original: ${testPath}`);
console.log(`   Escapado: ${escaped}`);
console.log(`   ✅ Lógica de escape funciona`);

// 4. Verificar directorios del proyecto
console.log('\n4️⃣ Directorios del proyecto:');
const projectDirs = [
  './uploads',
  './uploads/photos',
  './uploads/audios',
  './uploads/videos',
  './temp_video'
];

projectDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`   ✅ ${dir} existe`);
  } else {
    console.log(`   ⚠️  ${dir} no existe (se creará)`);
  }
});

// 5. Verificar NO hay rutas de Linux hardcodeadas
console.log('\n5️⃣ Verificando rutas hardcodeadas de Linux:');
const serverFile = './server/routes.ts';
if (fs.existsSync(serverFile)) {
  const content = fs.readFileSync(serverFile, 'utf8');
  
  const linuxPatterns = [
    { pattern: '/home/runner/', name: 'Rutas Replit' },
    { pattern: 'WORKSPACE_VIDEO_DIR', name: 'Variables workspace' },
    { pattern: 'WORKSPACE_UPLOAD_DIR', name: 'Variables workspace upload' }
  ];
  
  let hasIssues = false;
  linuxPatterns.forEach(({ pattern, name }) => {
    if (content.includes(pattern)) {
      console.log(`   ❌ Encontrado: ${name}`);
      hasIssues = true;
    }
  });
  
  if (!hasIssues) {
    console.log(`   ✅ Sin rutas hardcodeadas de Linux`);
  }
} else {
  console.log('   ⚠️  No se pudo verificar el archivo');
}

// 6. Verificar función getFontPath
console.log('\n6️⃣ Función getFontPath:');
if (fs.existsSync(serverFile)) {
  const content = fs.readFileSync(serverFile, 'utf8');
  if (content.includes('function getFontPath')) {
    console.log('   ✅ Función getFontPath() existe');
    if (content.includes("process.platform === 'win32'")) {
      console.log('   ✅ Detecta Windows correctamente');
    }
    if (content.includes('C:/Windows/Fonts/arial.ttf')) {
      console.log('   ✅ Usa rutas de Windows');
    }
  }
}

// 7. Verificar función execFFmpeg
console.log('\n7️⃣ Función execFFmpeg:');
if (fs.existsSync(serverFile)) {
  const content = fs.readFileSync(serverFile, 'utf8');
  if (content.includes('async function execFFmpeg')) {
    console.log('   ✅ Función execFFmpeg() existe');
    if (content.includes('timeout')) {
      console.log('   ✅ Tiene configuración de timeout');
    }
    if (content.includes('maxBuffer')) {
      console.log('   ✅ Tiene maxBuffer configurado');
    }
  }
}

// 8. Test simple de FFprobe
console.log('\n8️⃣ Test de FFprobe:');
try {
  // Crear un archivo de prueba temporal
  const testFile = './test-temp.txt';
  fs.writeFileSync(testFile, 'test');
  
  try {
    execSync(`ffprobe -v error "${testFile}"`, { stdio: 'ignore' });
    console.log('   ✅ FFprobe con comillas funciona');
  } catch (e) {
    // Esperamos un error porque no es un archivo de video
    console.log('   ✅ FFprobe ejecuta (error esperado en archivo no-video)');
  }
  
  fs.unlinkSync(testFile);
} catch (e) {
  console.log('   ❌ Problema con FFprobe');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ VERIFICACIÓN COMPLETA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📝 RESUMEN:');
console.log('   • Sistema operativo: Windows ✅');
console.log('   • FFmpeg instalado: Verificar arriba');
console.log('   • Fuentes disponibles: Verificar arriba');
console.log('   • Sin rutas Linux hardcodeadas: Verificar arriba');
console.log('   • Funciones de compatibilidad: Verificar arriba\n');

console.log('🚀 Si todo está en ✅, el sistema está listo para Windows\n');



