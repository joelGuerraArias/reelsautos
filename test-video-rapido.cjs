// Script de prueba para generar video rápidamente
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000 // 2 minutos timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(JSON.stringify(json)));
          } else {
            resolve(json);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function uploadPhoto(filePath, projectId) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('photo', fs.createReadStream(filePath));
    form.append('projectId', projectId);
    form.append('width', '1920');
    form.append('height', '1280');

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/photos',
      method: 'POST',
      headers: form.getHeaders(),
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

async function main() {
  console.log('🎬 Iniciando prueba de generación de video...\n');
  const startTime = Date.now();

  try {
    // 1. Crear proyecto
    console.log('📁 Creando proyecto...');
    const project = await makeRequest('POST', '/api/projects', {
      title: 'Test Video Rápido',
      description: 'Prueba del método rápido'
    });
    console.log(`   ✅ Proyecto creado: ${project.id}\n`);

    // 2. Obtener fotos existentes o usar las que hay
    console.log('📷 Buscando fotos existentes...');
    const photosDir = path.join(__dirname, 'uploads', 'photos');
    const photoFiles = fs.readdirSync(photosDir).slice(0, 3); // Solo 3 fotos para prueba rápida
    
    if (photoFiles.length === 0) {
      throw new Error('No hay fotos disponibles para la prueba');
    }
    console.log(`   Encontradas ${photoFiles.length} fotos\n`);

    // 3. Subir fotos al proyecto
    console.log('⬆️ Subiendo fotos...');
    const uploadedPhotos = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const photoPath = path.join(photosDir, photoFiles[i]);
      console.log(`   Subiendo foto ${i + 1}/${photoFiles.length}...`);
      const photo = await uploadPhoto(photoPath, project.id);
      uploadedPhotos.push(photo);
      console.log(`   ✅ Foto ${i + 1} subida (ID: ${photo.id})`);
    }
    console.log('');

    // 4. Generar audio
    console.log('🎤 Generando audio con ElevenLabs...');
    const audio = await makeRequest('POST', '/api/audios', {
      text: 'Este es un video de prueba del nuevo sistema rápido de generación.',
      voice: 'CwhRBWXzGAHq8TQ4Fs17', // Voz por defecto
      projectId: project.id
    });
    console.log(`   ✅ Audio generado (ID: ${audio.id}, duración: ${audio.duration}s)\n`);

    // 5. Configurar título en el proyecto
    console.log('📝 Configurando título...');
    await makeRequest('PATCH', `/api/projects/${project.id}`, {
      showTitle: true,
      titleText: 'VIDEO DE PRUEBA',
      titleFontSize: 32,
      titleColor: '#FFFFFF',
      titlePosition: 'bottom'
    });
    console.log('   ✅ Título configurado\n');

    // 6. Generar video
    console.log('🎬 Generando video...');
    const videoStartTime = Date.now();
    
    const video = await makeRequest('POST', '/api/videos', {
      photoIds: uploadedPhotos.map(p => p.id.toString()),
      audioId: audio.id,
      projectId: project.id
    });
    
    const videoTime = ((Date.now() - videoStartTime) / 1000).toFixed(2);
    console.log(`   ✅ Video generado en ${videoTime} segundos!`);
    console.log(`   📹 Archivo: ${video.filename}\n`);

    // Resumen
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('═══════════════════════════════════════');
    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════');
    console.log(`   Fotos usadas: ${uploadedPhotos.length}`);
    console.log(`   Duración audio: ${audio.duration}s`);
    console.log(`   Tiempo generación video: ${videoTime}s`);
    console.log(`   Tiempo total: ${totalTime}s`);
    console.log(`   Video: uploads/videos/${video.filename}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

