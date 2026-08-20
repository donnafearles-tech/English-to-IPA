import streamlit as st
import eng_to_ipa as ipa
# Tu código aquí...
import base64
from hume import HumeClient
from hume.tts import PostedUtterance, PostedUtteranceVoiceWithName

# Configuración básica de la página de Streamlit
st.set_page_config(page_title="Texto a Voz & Fonética", page_icon="🗣️", layout="centered")

st.title("🗣️ Texto a Voz con Hume AI")
st.markdown("Pega tu texto para escuchar su pronunciación y visualizar los símbolos fonéticos (IPA).")

# --- Barra lateral para configuración ---
with st.sidebar:
    st.header("⚙️ Configuración")
    api_key = st.text_input("Ingresa tu Hume API Key", type="password", help="Tu clave no se guardará.")
    voice_name = st.selectbox("Selecciona la Voz", ["Male English Actor", "Female English Actor"])

# --- Área principal ---
texto_ejemplo = "Beauty is no quality in things themselves: It exists merely in the mind which contemplates them."
text_input = st.text_area("📝 Pega tu texto aquí:", value=texto_ejemplo, height=150)

if st.button("Generar Audio y Fonética", type="primary"):
    # Validaciones previas
    if not api_key:
        st.warning("⚠️ Por favor, ingresa tu API Key en la barra lateral izquierda.")
    elif not text_input.strip():
        st.warning("⚠️ El campo de texto no puede estar vacío.")
    else:
        with st.spinner("Procesando la fonética y conectando con Hume AI..."):
            
            # 1. Generar y mostrar Símbolos Fonéticos
            st.subheader("🔤 Símbolos Fonéticos (IPA)")
            phonetic_text = ipa.convert(text_input)
            
            # Se muestra en un bloque estilizado
            st.info(phonetic_text)
            
            # 2. Generar el Audio con Hume AI
            st.subheader("🎧 Audio Generado")
            try:
                # Inicializar el cliente con la API Key del usuario
                client = HumeClient(api_key=api_key)
                
                # Llamada a la API (streaming)
                response = client.tts.synthesize_json_streaming(
                    utterances=[
                        PostedUtterance(
                            text=text_input,
                            voice=PostedUtteranceVoiceWithName(
                                name=voice_name,
                                provider="HUME_AI",
                            )
                        )
                    ],
                )
                
                # Recopilar los fragmentos (chunks) de audio
                audio_bytes = b""
                for chunk in response:
                    # Dependiendo de la estructura exacta del objeto de respuesta en la versión 
                    # actual del SDK de Hume, extraemos el string base64.
                    # Probamos los nombres de atributos más comunes:
                    if hasattr(chunk, 'audio_base64'):
                        audio_bytes += base64.b64decode(chunk.audio_base64)
                    elif hasattr(chunk, 'audio'):
                        audio_bytes += base64.b64decode(chunk.audio)
                    elif isinstance(chunk, dict) and 'audio_base64' in chunk:
                        audio_bytes += base64.b64decode(chunk['audio_base64'])

                # Renderizar el reproductor de audio si obtuvimos datos
                if audio_bytes:
                    st.audio(audio_bytes, format="audio/mp3")
                    st.success("¡Audio generado exitosamente!")
                else:
                    st.error("No se pudo extraer el audio de la respuesta de la API.")
                    
            except Exception as e:
                st.error(f"Error al generar el audio: {e}")
