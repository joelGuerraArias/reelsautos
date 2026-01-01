import streamlit as st
import cloudinary
import cloudinary.uploader
import requests
import tempfile
import subprocess
import os
from datetime import datetime, timedelta
import time
import re
import openai

# Configuración de Cloudinary
cloudinary.config(
    cloud_name="dhzxzbkmc",
    api_key="163795967844939",
    api_secret="Hurr0_2PG6nzEETFwbRM_PBtn5U",
    secure=True
)

WEBHOOK_URL = "https://hook.us1.make.com/1nk48toiy2c64f9966yue8bwhzqnosny"
TELEGRAM_BOT_TOKEN = "6802634007:AAEnzilJMGTBrWZAl8V5_2mYuAYJ0P51hUo"
TELEGRAM_CHAT_ID = "@FelixVictorinoBot"

# Función para limpiar títulos
def clean_title(titulo):
    titulo = titulo.replace("nmás", " más")
    titulo = re.sub(r"([a-zA-Z])\1{2,}", r"\1", titulo)
    return titulo.strip()

# Formatear título con OpenAI
def formatear_titulo_con_openai(titulo, api_key=None):
    if not api_key:
        st.warning("⚠️ No se ha configurado una clave de API de OpenAI. Se utilizará el formato básico.")
        return dividir_titulo(titulo)

    try:
        openai.api_key = api_key
        prompt = f"""
        Formatea el siguiente título para un video de redes sociales. 
        Si es demasiado largo, divídelo en dos líneas lógicas usando '\\n'. 
        Corrige cualquier error gramatical o de sintaxis.
        No añadas puntuación extra.
        No cambies el significado del título.
        Título original: "{titulo}"
        """
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Eres un asistente que formatea títulos para videos."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            temperature=0.2
        )
        titulo_formateado = response.choices[0].message.content.strip().replace('"', '')
        titulo_formateado = titulo_formateado.replace('\\n', r'\n')
        return titulo_formateado
    except Exception as e:
        st.warning(f"⚠️ Error al conectar con OpenAI: {str(e)}. Se utilizará el formato básico.")
        return dividir_titulo(titulo)

# Dividir título si no se usa OpenAI
def dividir_titulo(titulo, max_largo=50):
    if len(titulo) <= max_largo:
        return titulo
    palabras = titulo.split()
    mitad = len(palabras) // 2
    return " ".join(palabras[:mitad]) + r'\n' + " ".join(palabras[mitad:])

# Validar advertencias del título
def validar_titulo(titulo):
    advertencias = []
    if len(titulo) > 100:
        advertencias.append(f"⚠️ ADVERTENCIA: El título tiene {len(titulo)} caracteres (máximo recomendado: 100)")
    if "\\n" in titulo and not r'\n' in titulo:
        advertencias.append("⚠️ ADVERTENCIA: El título contiene '\\n' mal formateado. Para saltos de línea use r'\\n'")
    if "-n" in titulo:
        advertencias.append("⚠️ ADVERTENCIA: El título contiene '-n', posiblemente un intento de salto de línea")
    return advertencias

# Configuración de Streamlit
st.set_page_config(page_title="Batch de videos cada hora", layout="centered")
st.title("📆 Subir múltiples videos y publicarlos cada 1 hora automáticamente")

# OpenAI API Key
openai_api_key = st.sidebar.text_input("API Key de OpenAI (opcional)", type="password")
usar_openai = st.sidebar.checkbox("Usar OpenAI para formatear títulos", value=True)
st.sidebar.info("La API de OpenAI ayudará a formatear correctamente los títulos de los videos")

# Subida de videos
num_videos = st.number_input("¿Cuántos videos quieres subir?", min_value=1, max_value=10, step=1)
videos = []

for i in range(num_videos):
    st.subheader(f"🎬 Video #{i+1}")
    video_file = st.file_uploader(f"Selecciona el video #{i+1}", type=["mp4", "mov", "avi"], key=f"video_{i}")
    caption = st.text_area(f"Caption para el video #{i+1}", max_chars=2200, key=f"caption_{i}")

    title_input = st.text_input(f"Título para el video #{i+1} (opcional)", key=f"title_{i}")
    char_count = len(title_input.strip())
    st.caption(f"🔤 {char_count}/100 caracteres")
    if char_count > 100:
        st.warning("⚠️ El título excede los 100 caracteres recomendados.")

    hashtag = st.selectbox(
        f"Hashtag predeterminado para el video #{i+1}",
        options=["#formula1rd", "#FVdigital"],
        key=f"hashtag_{i}"
    )

    if video_file and caption:
        title_raw = title_input.strip() if title_input.strip() else os.path.splitext(video_file.name)[0]
        title = clean_title(title_raw)
        videos.append((video_file, f"{caption}\n\n{hashtag}", title))

start_hour = st.time_input("🕒 Hora inicial de publicación", value=datetime.now().time())

if st.button("🚀 Subir y comenzar publicación automática cada hora"):
    if not videos:
        st.warning("Debes subir al menos un video con caption.")
    else:
        now = datetime.now().replace(second=0, microsecond=0)
        start_time = now.replace(hour=start_hour.hour, minute=start_hour.minute)
        st.success(f"Iniciando batch de {len(videos)} videos desde las {start_time.strftime('%H:%M')}")

        for idx, (video_file, caption, title) in enumerate(videos):
            scheduled_time = start_time + timedelta(hours=idx)
            if 0 <= scheduled_time.hour < 6:
                scheduled_time = scheduled_time.replace(hour=6, minute=0)
                if scheduled_time < datetime.now():
                    scheduled_time += timedelta(days=1)

            st.info(f"⏳ Preparando video #{idx+1} para {scheduled_time.strftime('%Y-%m-%d %H:%M')}")

            advertencias_titulo = validar_titulo(title)
            for advertencia in advertencias_titulo:
                st.warning(advertencia)

            with st.spinner("🎞️ Procesando video..."):
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_input:
                    tmp_input.write(video_file.read())
                    input_path = tmp_input.name

                output_path = input_path.replace(".mp4", "_titled.mp4")

                if usar_openai:
                    titulo_formateado = formatear_titulo_con_openai(title.strip(), openai_api_key)
                    st.info(f"✨ Título formateado con OpenAI: {titulo_formateado}")
                else:
                    titulo_formateado = dividir_titulo(title.strip())

                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-i", input_path,
                    "-vf", f"drawtext=text='{titulo_formateado}':fontcolor=white:fontsize=18:"
                           f"box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=h-(text_h*1.2)-30",
                    "-c:a", "copy",
                    output_path
                ]

                process = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if process.returncode != 0:
                    st.error(f"❌ Error procesando video #{idx+1}:\n{process.stderr.decode()}")
                    continue

            with st.spinner("☁️ Subiendo a Cloudinary..."):
                result = cloudinary.uploader.upload_large(
                    output_path,
                    resource_type="video",
                    folder="webhook_batch"
                )
                video_url = result.get("secure_url")

            payload = {
                "video_url": video_url,
                "caption": caption,
                "title": title
            }

            st.subheader("📦 Payload enviado al webhook:")
            st.json(payload)

            response = requests.post(WEBHOOK_URL, json=payload)

            if response.status_code == 200:
                st.success(f"✅ Publicado video #{idx+1} con éxito")

                telegram_message = (
                    f"📹 *Video #{idx+1} publicado exitosamente*\n\n"
                    f"*Título:* {title}\n"
                    f"*Programado para:* {scheduled_time.strftime('%Y-%m-%d %H:%M')}\n"
                    f"*Link:* {video_url}\n"
                    f"*Caption:* {caption}"
                )
                telegram_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
                telegram_data = {
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": telegram_message,
                    "parse_mode": "Markdown"
                }
                telegram_response = requests.post(telegram_url, data=telegram_data)

                if telegram_response.status_code == 200:
                    st.info("📬 Notificación enviada a Telegram")
                else:
                    st.warning("⚠️ No se pudo enviar mensaje a Telegram")

            else:
                st.error(f"❌ Fallo al enviar video #{idx+1} (código {response.status_code})")

            if idx < len(videos) - 1:
                st.warning("⏸️ Esperando 1 hora antes del siguiente video...")
                time.sleep(3600)

        st.balloons()
        st.success("🎉 Todos los videos han sido publicados automáticamente.")

