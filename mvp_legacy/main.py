import sys
import threading
import cv2
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                               QHBoxLayout, QLabel, QPushButton, QTextEdit, QFrame)
from PySide6.QtGui import QImage, QPixmap
from PySide6.QtCore import Qt, QTimer, Slot, QMetaObject, Q_ARG
from google import genai

# Configuración de Gemini API (Placeholder para MVP)
# El usuario debe poner su API KEY aquí
GEMINI_API_KEY = "TU_API_KEY_AQUI"

SYSTEM_PROMPT = """
Rol: Eres un consultor experto en Iridología Clínica Teórica. Tu propósito es analizar fotografías del iris humano proporcionadas por el usuario y generar un reporte basado estrictamente en la literatura iridológica clínica proporcionada en tu base de conocimientos. No eres un médico alópata y siempre debes recordar al usuario que este análisis es teórico y referencial.
Metodología de Análisis (Protocolo Sistémico):
La evaluación clínica del iris debe regirse por un estricto orden de prioridad iridológica que descarte la subjetividad interpretativa y jerarquice los hallazgos en función de su profundidad orgánica y cronicidad metabólica.

Paso 1: Evaluación de la Densidad del Estroma (Constitución de Base)
* Determina la constitución primaria (Linfática, Hematógena o Mixta).
* Evalúa el grado de densidad del estroma (Seda a Red) para establecer la base de la resiliencia del paciente. Por ejemplo, una densidad de Grado 3 (Lino) indica un potencial de recuperación del 70% a 80%.

Paso 2: Identificación de Signos Estructurales
Identifica alteraciones físicas en el tejido colágeno del estroma:
* Lagunas: Vacuolas que indican tejido orgánico debilitado. Clasifícalas si es posible:
* Laguna de tres: Tendencia a degeneración tisular severa.
* Laguna de medusa: Asociada a predisposición pre-cancerosa.
* Laguna de torpedo: Indica predisposición a procesos tumorales, especialmente en órganos endocrinos.
* Laguna de teja: Señala tendencia a tumoraciones benignas compresivas.
* Laguna de hongo: Propensión a hipertrofia en glándulas endocrinas.
* Laguna de Diana: Revelan desequilibrios neurovegetativos graves.
* Laguna de negativo: Predisposición metabólica a gota o diabetes.
* Laguna luminosa: Proceso de curación activa.
* Criptas: Pequeñas lagunas profundas que son signos de cronicidad o destrucción tisular localizada.
* Rayos Solares: Brechas radiales que indican canales de drenaje tóxico y tensión nerviosa hacia el cuadrante de destino.
* Anillos de Tensión: Arcos concéntricos que reflejan un estado de estrés neuromuscular y sobrecarga del sistema nervioso simpático.

Formato de Salida:
Entrega un reporte estructurado que incluya: 1. Resumen Constitucional (Terreno biológico), 2. Hallazgos Estructurales por Cuadrante, 3. Correlación de Sistemas del Cuerpo (Digestivo, Nervioso, Endocrino, etc.), 4. Conclusión Teórica.
"""

class VitalEyeApp(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("VitalEye - Iridología Clínica MVP (Desktop)")
        self.resize(1100, 700)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f4f7f6;
            }
            QPushButton {
                background-color: #0056b3;
                color: white;
                border-radius: 6px;
                padding: 10px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #004494;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
            QTextEdit {
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 10px;
                color: #333;
            }
            QLabel#title {
                color: #0056b3;
                font-size: 20px;
                font-weight: bold;
            }
        """)

        # Main widget and layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(20)

        # Video Frame (Left)
        video_frame = QFrame()
        video_frame.setFrameShape(QFrame.StyledPanel)
        video_frame.setStyleSheet("background-color: white; border-radius: 10px;")
        video_layout = QVBoxLayout(video_frame)
        
        self.video_label = QLabel("Presiona 'Iniciar Cámara'")
        self.video_label.setAlignment(Qt.AlignCenter)
        self.video_label.setStyleSheet("background-color: black; color: white; border-radius: 8px;")
        video_layout.addWidget(self.video_label, 1)

        controls_layout = QHBoxLayout()
        self.start_btn = QPushButton("Iniciar Cámara")
        self.start_btn.clicked.connect(self.start_camera)
        controls_layout.addWidget(self.start_btn)

        self.capture_btn = QPushButton("Capturar y Analizar Iris")
        self.capture_btn.setEnabled(False)
        self.capture_btn.clicked.connect(self.capture_and_analyze)
        controls_layout.addWidget(self.capture_btn)

        video_layout.addLayout(controls_layout)
        main_layout.addWidget(video_frame, 1)

        # Results Frame (Right)
        results_frame = QFrame()
        results_frame.setFrameShape(QFrame.StyledPanel)
        results_frame.setStyleSheet("background-color: white; border-radius: 10px;")
        results_layout = QVBoxLayout(results_frame)

        results_title = QLabel("Reporte Clínico Teórico")
        results_title.setObjectName("title")
        results_layout.addWidget(results_title)

        self.results_textbox = QTextEdit()
        self.results_textbox.setReadOnly(True)
        self.results_textbox.setText("Esperando captura para análisis...")
        self.results_textbox.setStyleSheet("font-size: 14px; border: none;")
        results_layout.addWidget(self.results_textbox, 1)

        main_layout.addWidget(results_frame, 1)

        # Variables for camera
        self.cap = None
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_video_stream)
        self.current_frame = None

    def start_camera(self):
        if not self.timer.isActive():
            self.cap = cv2.VideoCapture(0) # 0 for default webcam
            if not self.cap.isOpened():
                self.update_results("Error: No se pudo acceder a la cámara.")
                return
            
            self.start_btn.setText("Detener Cámara")
            self.start_btn.clicked.disconnect()
            self.start_btn.clicked.connect(self.stop_camera)
            self.capture_btn.setEnabled(True)
            self.video_label.setText("")
            self.timer.start(30) # ~30 fps

    def stop_camera(self):
        self.timer.stop()
        if self.cap:
            self.cap.release()
            self.cap = None
        self.video_label.clear()
        self.video_label.setText("Cámara Detenida")
        self.start_btn.setText("Iniciar Cámara")
        self.start_btn.clicked.disconnect()
        self.start_btn.clicked.connect(self.start_camera)
        self.capture_btn.setEnabled(False)

    def update_video_stream(self):
        if self.cap is not None:
            ret, frame = self.cap.read()
            if ret:
                # Mirror effect
                frame = cv2.flip(frame, 1)
                self.current_frame = frame.copy()
                
                # Convert BGR to RGB
                rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                h, w, ch = rgb_image.shape
                bytes_per_line = ch * w
                convert_to_Qt_format = QImage(rgb_image.data, w, h, bytes_per_line, QImage.Format_RGB888)
                p = convert_to_Qt_format.scaled(self.video_label.width(), self.video_label.height(), Qt.KeepAspectRatio)
                self.video_label.setPixmap(QPixmap.fromImage(p))

    def capture_and_analyze(self):
        if self.current_frame is None:
            return

        self.capture_btn.setEnabled(False)
        self.update_results("Procesando terreno biológico y signos estructurales...\nGenerando reporte clínico teórico por favor espera.")

        # Convert to RGB and then to PIL Image format (which gemini genai requires)
        from PIL import Image
        frame_rgb = cv2.cvtColor(self.current_frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)

        threading.Thread(target=self.call_gemini_api, args=(pil_image,), daemon=True).start()

    def call_gemini_api(self, image):
        try:
            if GEMINI_API_KEY == "TU_API_KEY_AQUI":
                text = "Error: Debes configurar tu API KEY de Gemini en la línea 10 de main.py (GEMINI_API_KEY = \"...\")."
            else:
                client = genai.Client(api_key=GEMINI_API_KEY)
                prompt = "Actúa como experto iridólogo siguiendo el protocolo clínico sistémico. Analiza esta imagen del iris, determina la densidad del estroma, e identifica posibles signos estructurales como lagunas, criptas o anillos de tensión. Genera el reporte estructurado."
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[prompt, image],
                    config=genai.types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT)
                )
                text = response.text
        except Exception as e:
            text = f"Ocurrió un error al procesar con Gemini API:\n\n{str(e)}"
        
        # Cross thread call safely
        QMetaObject.invokeMethod(self, "_update_results_safe", Qt.QueuedConnection, Q_ARG(str, text))

    def update_results(self, text):
        self._update_results_safe(text)

    @Slot(str)
    def _update_results_safe(self, text):
        self.results_textbox.setText(text)
        if text != "Procesando terreno biológico y signos estructurales...\nGenerando reporte clínico teórico por favor espera.":
            self.capture_btn.setEnabled(True)

    def closeEvent(self, event):
        self.stop_camera()
        event.accept()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = VitalEyeApp()
    window.show()
    sys.exit(app.exec())
