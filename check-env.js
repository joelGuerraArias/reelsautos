// Script para verificar la configuración del .env
import 'dotenv/config';

console.log('\n🔍 Verificando configuración del proyecto...\n');

const checks = [
  {
    name: 'DATABASE_URL',
    value: process.env.DATABASE_URL,
    required: true,
    type: 'database'
  },
  {
    name: 'ELEVENLABS_API_KEY',
    value: process.env.ELEVENLABS_API_KEY,
    required: true,
    type: 'api'
  },
  {
    name: 'NODE_ENV',
    value: process.env.NODE_ENV || 'development',
    required: false,
    type: 'config'
  }
];

let allGood = true;

checks.forEach(check => {
  const icon = check.value ? '✅' : (check.required ? '❌' : '⚠️');
  const status = check.value ? 'CONFIGURADO' : 'NO CONFIGURADO';
  
  console.log(`${icon} ${check.name}: ${status}`);
  
  if (check.value) {
    // Mostrar preview sin revelar la key completa
    if (check.type === 'api') {
      const preview = check.value.substring(0, 8) + '...' + check.value.substring(check.value.length - 4);
      console.log(`   Preview: ${preview}`);
    } else if (check.type === 'database') {
      const preview = check.value.substring(0, 20) + '...';
      console.log(`   Preview: ${preview}`);
    } else {
      console.log(`   Valor: ${check.value}`);
    }
  }
  
  if (check.required && !check.value) {
    allGood = false;
  }
  
  console.log('');
});

console.log('━'.repeat(50));

if (allGood) {
  console.log('✅ ¡Todo está configurado correctamente!');
  console.log('\nPuedes iniciar el proyecto con:');
  console.log('  npm run dev');
} else {
  console.log('❌ Faltan configuraciones requeridas');
  console.log('\nPor favor, edita tu archivo .env con las variables necesarias.');
  console.log('Lee INSTRUCCIONES-SETUP.md para más detalles.');
}

console.log('━'.repeat(50) + '\n');



