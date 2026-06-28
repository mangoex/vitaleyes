"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Info, Shield, Award, Activity, X } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setReport(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      // We need to wait for the video element to be rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("No se pudo acceder a la cámara. Por favor verifica los permisos del navegador.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setImage(dataUrl);
      setReport(null);
      stopCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const analyzeImage = async () => {
    if (!image) return;
    
    setLoading(true);
    try {
      const base64Data = image.split(",")[1];
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Data }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setReport(data.report);
      } else {
        alert("Error en el análisis: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al analizar la imagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.logoIcon}>
            <Shield size={24} />
          </div>
          <div className={styles.titleGroup}>
            <h1>
              Iridoclinic <span className={styles.proBadge}>PRO v2.4</span>
            </h1>
            <p className={styles.subtitle}>
              Plataforma Profesional de Diagnóstico e Interpretación del Iris
            </p>
          </div>
        </div>
        
        <div className={styles.statusBadges}>
          <div className={styles.badge}>
            <div className={styles.dot}></div>
            Enlace Clínico Gemini <strong>Activo</strong>
          </div>
          <div className={styles.badge}>
            Reglas: <strong>Escuelas Alemana & Jensen</strong>
          </div>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {isCameraActive ? (
          <div className={styles.uploadArea} style={{ padding: '2rem', cursor: 'default' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <button 
                onClick={stopCamera}
                style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ width: '100%', borderRadius: '12px', backgroundColor: '#000' }}
              />
            </div>
            <button 
              className={styles.uploadButton} 
              style={{ backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)', color: 'white', marginTop: '1.5rem', padding: '1rem 3rem', fontSize: '1.1rem' }}
              onClick={takePhoto}
            >
              <Camera size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
              Capturar Iris
            </button>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        ) : !image ? (
          <div className={styles.uploadArea}>
            <div 
              className={styles.cameraIcon} 
              onClick={startCamera}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Camera size={32} />
            </div>
            <h2 className={styles.uploadTitle} onClick={startCamera} style={{ cursor: 'pointer' }}>
              Haga clic en la cámara para tomar una foto
            </h2>
            <p className={styles.uploadSubtitle}>O arrastre su macrofotografía aquí</p>
            {cameraError && <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{cameraError}</p>}
            
            <button 
              className={styles.uploadButton} 
              onClick={() => fileInputRef.current.click()}
            >
              Seleccionar Archivo
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
              Formatos recomendados: JPEG, PNG • Máx 10 MB
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <img src={image} alt="Iris Preview" className={styles.previewImage} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className={styles.uploadButton} 
                onClick={startCamera}
              >
                <Camera size={16} style={{ display: 'inline', marginRight: '6px' }}/>
                Tomar otra foto
              </button>
              <button 
                className={styles.uploadButton} 
                onClick={() => { setImage(null); setReport(null); fileInputRef.current.click(); }}
              >
                Subir otro archivo
              </button>
            </div>
          </div>
        )}

        {report && (
          <div className={styles.infoBox} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', display: 'block', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
            <h3 style={{ color: 'var(--accent-green)', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} />
              Reporte Clínico Teórico
            </h3>
            {report}
          </div>
        )}

        <div className={styles.infoBox}>
          <div className={styles.infoIcon}>
            <Info size={24} />
          </div>
          <div className={styles.infoContent}>
            <h3>Recomendaciones para una Captura Profesional de Calidad:</h3>
            <ul>
              <li>Utilice iluminación lateral oblicua para evitar reflejos frontales directos sobre la pupila.</li>
              <li>Asegúrese de enfocar perfectamente las fibras del estroma y la pupila para un análisis correcto.</li>
              <li>La imagen debe estar recortada y mostrar preferentemente solo el iris completo en alta resolución.</li>
            </ul>
          </div>
        </div>
      </main>

      <div className={styles.bottomBar}>
        <button 
          className={styles.analyzeBtn} 
          onClick={analyzeImage}
          disabled={!image || loading}
        >
          <Activity size={20} />
          {loading ? "Analizando Terreno Biológico..." : "Analizar Fotografía de Iris"}
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: "none" }} 
        accept="image/*"
        onChange={handleImageUpload}
      />
    </div>
  );
}
