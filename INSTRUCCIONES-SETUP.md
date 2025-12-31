# 🚀 Instrucciones para Configurar PhotoStoryMaker

## ✅ Problema Resuelto
- ✔️ Servidor configurado para funcionar en Windows (localhost)

## 🔧 Configuración Necesaria

### 1. Archivo `.env`

Crea o edita el archivo `.env` en la raíz del proyecto con estas variables:

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql://usuario:password@host:5432/database

# API Key de ElevenLabs (para text-to-speech)
ELEVENLABS_API_KEY=tu_api_key_aqui

# Entorno
NODE_ENV=development
```

### 2. ¿Cómo obtener las credenciales?

#### **DATABASE_URL** (PostgreSQL)
- **Opción 1 - Neon (Recomendado, GRATIS):**
  1. Visita: https://neon.tech
  2. Crea una cuenta gratuita
  3. Crea un nuevo proyecto
  4. Copia la connection string que se ve así:
     ```
     postgresql://usuario:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

- **Opción 2 - PostgreSQL Local:**
  1. Instala PostgreSQL en tu PC
  2. Crea una base de datos
  3. Usa: `postgresql://postgres:tu_password@localhost:5432/photostorymaker`

#### **ELEVENLABS_API_KEY** (Text-to-Speech)
1. Visita: https://elevenlabs.io
2. Crea una cuenta (tienen plan gratuito con 10,000 caracteres/mes)
3. Ve a Settings → API Keys
4. Copia tu API key

### 3. Configurar la Base de Datos

Una vez que tengas el `.env` configurado:

```bash
# Crear las tablas en la base de datos
npm run db:push
```

### 4. Iniciar el Proyecto

```bash
# Si aún no instalaste dependencias:
npm install

# Iniciar el servidor en modo desarrollo:
npm run dev
```

El servidor correrá en: **http://localhost:5000**

---

## ⚠️ Errores Comunes

### Error: "Failed to generate audio from Eleven Labs"
**Causa**: API key inválida o no configurada
**Solución**: Verifica que `ELEVENLABS_API_KEY` en `.env` sea correcta

### Error: "DATABASE_URL is not set"
**Causa**: Variable de entorno no configurada
**Solución**: Agrega `DATABASE_URL` al archivo `.env`

### Error: "listen ENOTSUP"
**Causa**: Problema de socket en Windows (YA RESUELTO)
**Solución**: Ya se cambió el host a `localhost` para Windows

---

## 🎯 Verificar Configuración

Para probar si ElevenLabs funciona:

```bash
npx tsx test-elevenlabs.ts
```

---

## 📝 Notas

- El plan gratuito de ElevenLabs permite 10,000 caracteres/mes
- Neon (base de datos) ofrece 0.5GB gratis permanentemente
- FFmpeg debe estar instalado para generar videos

## 🔗 Enlaces Útiles

- **ElevenLabs**: https://elevenlabs.io
- **Neon Database**: https://neon.tech
- **FFmpeg Download**: https://ffmpeg.org/download.html



