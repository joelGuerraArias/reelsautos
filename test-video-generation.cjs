/**
 * Script de prueba para generar un video con título
 * Genera fotos con FFmpeg, audio y video de prueba
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:5000/api';

// Crear una imagen de prueba con FFmpeg
function createTestImageWithFFmpeg(text, color, filename) {
  console.log(`   Creando imagen: ${text}...`);
  
  // Comando FFmpeg para crear imagen con color y texto
  const command = `ffmpeg -y -f lavfi -i color=c=${color}:s=1280x720:d=1 -vf "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${text}':fontcolor=white:fontsize=80:x=(w-tw)/2:y=(h-th)/2:box=1:boxcolor=black@0.8:boxborderw=10" -frames:v 1 "${filename}"`;
  
  try {
    execSync(command, { stdio: 'pipe' });
    console.log(`   ✅ ${filename}`);
    return filename;
  } catch (error) {
    console.error(`   ❌ Error creando imagen: ${error.message}`);
    throw error;
  }
}

async function testVideoGeneration() {
  try {
    console.log('\n🎬 ========================================');
    console.log('   GENERACIÓN DE VIDEO DE PRUEBA');
    console.log('   ========================================\n');
    
    // 1. Crear proyecto
    console.log('📁 Paso 1: Creando proyecto...');
    const projectResponse = await axios.post(`${API_URL}/projects`, {
      title: 'Test Video con Título',
      description: 'Video de prueba generado automáticamente'
    });
    const projectId = projectResponse.data.id;
    console.log(`   ✅ Proyecto creado: ${projectId}\n`);
    
    // 2. Crear directorio temporal
    console.log('📂 Paso 2: Preparando archivos temporales...');
    const tempDir = path.join(process.cwd(), 'temp_test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    console.log(`   ✅ Directorio temporal: ${tempDir}\n`);
    
    // 3. Crear imágenes de prueba con FFmpeg
    console.log('🎨 Paso 3: Generando imágenes de prueba...');
    const image1 = createTestImageWithFFmpeg('IMAGEN 1', '0x3498db', path.join(tempDir, 'test1.png'));
    const image2 = createTestImageWithFFmpeg('IMAGEN 2', '0xe74c3c', path.join(tempDir, 'test2.png'));
    const image3 = createTestImageWithFFmpeg('IMAGEN 3', '0x2ecc71', path.join(tempDir, 'test3.png'));
    console.log('');
    
    // 4. Subir imágenes
    console.log('📤 Paso 4: Subiendo imágenes al servidor...');
    const photoIds = [];
    const FormData = require('form-data');
    
    for (let i = 0; i < [image1, image2, image3].length; i++) {
      const imagePath = [image1, image2, image3][i];
      const form = new FormData();
      form.append('photo', fs.createReadStream(imagePath));
      form.append('width', '1280');
      form.append('height', '720');
      form.append('projectId', projectId);
      
      const photoResponse = await axios.post(`${API_URL}/photos`, form, {
        headers: form.getHeaders()
      });
      photoIds.push(String(photoResponse.data.id)); // Convertir a string
      console.log(`   ✅ Imagen ${i + 1} subida (ID: ${photoResponse.data.id})`);
    }
    console.log('');
    
    // 5. Configurar el título en app settings
    console.log('📝 Paso 5: Configurando título...');
    const titleText = 'Este es un título de prueba\nGenerado automáticamente el ' + new Date().toLocaleDateString();
    await axios.patch(`${API_URL}/app-settings`, {
      showTitle: true,
      titleText: titleText,
      titleFontSize: 28,
      titleColor: '#ffffff',
      titlePosition: 'bottom'
    });
    console.log(`   ✅ Título: "${titleText.replace(/\n/g, ' ')}"`);
    console.log('   ✅ Posición: Parte inferior, centrado\n');
    
    // 6. Generar audio
    console.log('🎤 Paso 6: Generando audio con ElevenLabs...');
    const audioText = 'Bienvenidos a esta prueba de generación automática de video con título. Este video demuestra que el sistema funciona correctamente y el título se muestra en la parte inferior.';
    console.log(`   Texto: "${audioText.substring(0, 60)}..."`);
    
    // Obtener las voces disponibles
    const voicesResponse = await axios.get(`${API_URL}/voices`);
    const voices = voicesResponse.data.voices;
    
    // Usar una voz en español si existe
    let selectedVoice = voices[0].voice_id;
    const spanishVoice = voices.find(v => 
      v.name.toLowerCase().includes('spanish') || 
      v.name.toLowerCase().includes('español') ||
      v.labels?.language?.toLowerCase() === 'es'
    );
    if (spanishVoice) {
      selectedVoice = spanishVoice.voice_id;
      console.log(`   Voz seleccionada: ${spanishVoice.name}`);
    } else {
      console.log(`   Voz seleccionada: ${voices[0].name}`);
    }
    
    const audioResponse = await axios.post(`${API_URL}/audios`, {
      text: audioText,
      voice: selectedVoice,
      projectId: projectId
    });
    const audioId = audioResponse.data.id;
    const audioDuration = audioResponse.data.duration;
    console.log(`   ✅ Audio generado (ID: ${audioId}, Duración: ${audioDuration}s)\n`);
    
    // 7. Generar video
    console.log('🎬 Paso 7: Generando video...');
    console.log('   ⏳ Este proceso puede tardar 1-3 minutos...');
    console.log('   📹 El servidor está procesando las imágenes y agregando el título...\n');
    
    const startTime = Date.now();
    const videoResponse = await axios.post(`${API_URL}/videos`, {
      photoIds: photoIds,
      audioId: audioId,
      projectId: projectId
    }, {
      timeout: 600000 // 10 minutos de timeout
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const videoData = videoResponse.data;
    console.log(`   ✅ Video generado en ${duration}s`);
    console.log(`   📄 Archivo: ${videoData.filename}`);
    console.log(`   ⏱️  Duración: ${videoData.duration}s\n`);
    
    // 8. Copiar video a la raíz
    console.log('📁 Paso 8: Guardando video en la raíz...');
    const sourceVideo = videoData.filepath;
    const destVideo = path.join(process.cwd(), 'VIDEO_PRUEBA_CON_TITULO.mp4');
    
    if (fs.existsSync(destVideo)) {
      fs.unlinkSync(destVideo);
    }
    fs.copyFileSync(sourceVideo, destVideo);
    console.log(`   ✅ Video guardado: ${destVideo}\n`);
    
    // 9. Limpiar archivos temporales
    console.log('🧹 Paso 9: Limpiando archivos temporales...');
    try {
      fs.unlinkSync(image1);
      fs.unlinkSync(image2);
      fs.unlinkSync(image3);
      fs.rmdirSync(tempDir);
      console.log('   ✅ Limpieza completada\n');
    } catch (e) {
      console.log('   ⚠️  Algunos archivos temporales no se pudieron eliminar\n');
    }
    
    // 10. Resumen
    console.log('🎉 ========================================');
    console.log('   ¡VIDEO GENERADO EXITOSAMENTE!');
    console.log('   ========================================\n');
    console.log('📹 Ubicación del video:');
    console.log(`   ${destVideo}\n`);
    console.log('📋 Detalles del video:');
    console.log(`   • Proyecto: ${projectId}`);
    console.log(`   • Imágenes: ${photoIds.length} fotos`);
    console.log(`   • Audio: ${audioDuration}s`);
    console.log(`   • Título: Visible en la parte inferior`);
    console.log(`   • Tiempo de generación: ${duration}s\n`);
    console.log('✅ El video debe mostrar:');
    console.log('   1. Tres imágenes de colores (azul, rojo, verde)');
    console.log('   2. Audio de narración');
    console.log('   3. Título en la parte inferior con fondo negro\n');
    console.log('🎬 ¡Listo para reproducir!\n');
    
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('   ERROR DURANTE LA GENERACIÓN');
    console.error('   ========================================\n');
    if (error.response) {
      console.error(`Estado HTTP: ${error.response.status}`);
      console.error(`Mensaje: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('No se pudo conectar al servidor.');
      console.error('Asegúrate de que el servidor esté corriendo en http://localhost:5000');
    } else {
      console.error(`Error: ${error.message}`);
    }
    console.error('\n');
    process.exit(1);
  }
}

// Verificar que el servidor esté corriendo
async function checkServer() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Ejecutar el test
(async () => {
  console.log('\n🔍 Verificando servidor...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ El servidor no está corriendo.');
    console.error('   Por favor, ejecuta: npm run dev');
    console.error('');
    process.exit(1);
  }
  
  console.log('✅ Servidor en línea\n');
  await testVideoGeneration();
})();
