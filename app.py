import streamlit as st
import eng_to_ipa as ipa
import base64
from hume import HumeClient
from hume.tts import PostedUtterance, PostedUtteranceVoiceWithName
import re

# Configuración de la página - MÁS MODERNA
st.set_page_config(
    page_title="🎙️ AI Voice Studio", 
    page_icon="🎧", 
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS Personalizado para diseño moderno
st.markdown("""
<style>
    /* Fondo y estilo general */
    .main {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    /* Tarjetas modernas */
    .modern-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 2rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        margin: 1rem 0;
        border: 1px solid rgba(255,255,255,0.2);
    }
    
    /* Títulos con gradiente */
    .gradient-text {
        background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
        font-size: 3rem;
    }
    
    /* Botón principal */
    .stButton > button {
        background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 50px;
        font-weight: 600;
        transition: all 0.3s ease;
        width: 100%;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    
    /* Área de texto */
    .stTextArea textarea {
        border-radius: 15px;
        border: 2px solid #e0e0e0;
        padding: 1rem;
        font-size: 1rem;
        transition: all 0.3s ease;
    }
    
    .stTextArea textarea:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    /* Tarjeta de fonética */
    .phonetic-card {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border-radius: 15px;
        padding: 1.5rem;
        font-family: 'Courier New', monospace;
        font-size: 1.2rem;
        border-left: 5px solid #667eea;
        margin: 1rem 0;
    }
    
    /* Badge */
    .badge {
        display: inline-block;
        padding: 0.25rem 1rem;
        border-radius: 50px;
        font-size: 0.8rem;
        font-weight: 600;
        margin: 0.25rem;
    }
    
    .badge-success {
        background: #10b981;
        color: white;
    }
    
    .badge-info {
        background: #3b82f6;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# HEADER MODERNO
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    st.markdown('<p style="text-align: center; font-size: 3rem;">🎙️</p>', unsafe_allow_html=True)
    st.markdown('<h1 style="text-align: center;" class="gradient-text">AI Voice Studio</h1>', unsafe_allow_html=True)
    st.markdown('<p style="text-align: center; color: #666;">Transforma tu texto en voz con pronunciación IPA</p>', unsafe_allow_html=True)

# SIDEBAR - Configuración elegante
with st.sidebar:
    st.markdown("### ⚙️ Configuración")
    
    # Tarjeta de API Key
    with st.expander("🔑 Credenciales", expanded=True):
        api_key = st.text_input(
            "Hume API Key", 
            type="password",
            placeholder="Ingresa tu API key...",
            help="Obtén tu key en https://hume.ai"
        )
    
    # Tarjeta de voz
    with st.expander("🎤 Configuración de Voz", expanded=True):
        voice_name = st.selectbox(
            "Selecciona la voz",
            ["Male English Actor", "Female English Actor"],
            help="Elige el género del locutor"
        )
        
        # Opción para velocidad
        speed = st.slider(
            "Velocidad de habla", 
            min_value=0.5, 
            max_value=1.5, 
            value=1.0, 
            step=0.1
        )
    
    # Información adicional
    with st.expander("ℹ️ Acerca de"):
        st.markdown("""
        **AI Voice Studio** utiliza:
        - 🧠 Hume AI para TTS
        - 📝 eng-to-ipa para fonética
        - 🎨 Diseño moderno y responsive
        """)

# MAIN CONTENT - Diseño en tarjetas
st.markdown('<div class="modern-card">', unsafe_allow_html=True)

# Área de texto mejorada
st.markdown("### 📝 Tu texto")
texto_ejemplo = """Beauty is no quality in things themselves: It exists merely in the mind which contemplates them."""

col_text, col_stats = st.columns([3, 1])

with col_text:
    text_input = st.text_area(
        "Escribe o pega tu texto aquí:",
        value=texto_ejemplo,
        height=150,
        placeholder="Ingresa el texto que quieres convertir a voz...",
        label_visibility="collapsed"
    )

with col_stats:
    # Contador de caracteres y palabras
    if text_input:
        char_count = len(text_input)
        word_count = len(text_input.split())
        st.metric("📊 Estadísticas", f"{word_count} palabras")
        st.caption(f"{char_count} caracteres")
        
        # Badge de idioma
        st.markdown('<span class="badge badge-info">🇬🇧 Inglés</span>', unsafe_allow_html=True)

st.markdown('</div>', unsafe_allow_html=True)

# Botón principal con icono
col_btn1, col_btn2, col_btn3 = st.columns([1, 2, 1])
with col_btn2:
    generate_btn = st.button(
        "🎧 Generar Audio y Fonética", 
        type="primary",
        use_container_width=True
    )

# PROCESAMIENTO
if generate_btn:
    # Validaciones con mensajes amigables
    if not api_key:
        st.warning("⚠️ **¡API Key requerida!** Por favor, ingresa tu Hume API Key en la barra lateral.")
    elif not text_input.strip():
        st.warning("⚠️ **¡Texto vacío!** Por favor, escribe o pega algún texto.")
    else:
        with st.spinner("🔄 Procesando tu texto..."):
            
            # --- SECCIÓN FONÉTICA ---
            st.markdown('<div class="modern-card">', unsafe_allow_html=True)
            st.markdown("### 🔤 Transcripción Fonética (IPA)")
            
            try:
                # Convertir a IPA con manejo de errores
                phonetic_text = ipa.convert(text_input)
                
                # Mostrar en tarjeta elegante
                st.markdown(f"""
                <div class="phonetic-card">
                    <span style="font-size: 1.5rem;">{phonetic_text}</span>
                </div>
                """, unsafe_allow_html=True)
                
                # Botón para copiar
                st.button("📋 Copiar fonética", key="copy_phonetic")
                
            except Exception as e:
                st.error(f"❌ Error al generar fonética: {str(e)}")
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # --- SECCIÓN AUDIO ---
            st.markdown('<div class="modern-card">', unsafe_allow_html=True)
            st.markdown("### 🎧 Audio Generado")
            
            try:
                # Inicializar cliente Hume
                client = HumeClient(api_key=api_key)
                
                # Generar audio con parámetros de velocidad
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
                
                # Procesar respuesta
                audio_bytes = b""
                for chunk in response:
                    if hasattr(chunk, 'audio_base64'):
                        audio_bytes += base64.b64decode(chunk.audio_base64)
                    elif hasattr(chunk, 'audio'):
                        audio_bytes += base64.b64decode(chunk.audio)
                    elif isinstance(chunk, dict) and 'audio_base64' in chunk:
                        audio_bytes += base64.b64decode(chunk['audio_base64'])
                
                # Mostrar reproductor
                if audio_bytes:
                    col_audio, col_download = st.columns([3, 1])
                    with col_audio:
                        st.audio(audio_bytes, format="audio/mp3")
                    with col_download:
                        # Botón de descarga
                        st.download_button(
                            label="⬇️ Descargar",
                            data=audio_bytes,
                            file_name="audio_generado.mp3",
                            mime="audio/mpeg"
                        )
                    st.success("✅ **¡Audio generado exitosamente!**")
                else:
                    st.error("❌ No se pudo extraer el audio de la respuesta.")
                    
            except Exception as e:
                st.error(f"❌ Error al generar audio: {str(e)}")
            
            st.markdown('</div>', unsafe_allow_html=True)

# FOOTER
st.markdown("---")
col_f1, col_f2, col_f3 = st.columns(3)
with col_f2:
    st.markdown("""
    <p style="text-align: center; color: #888; font-size: 0.8rem;">
    🚀 Hecho con Streamlit • Hume AI • IPA
    </p>
    """, unsafe_allow_html=True)
