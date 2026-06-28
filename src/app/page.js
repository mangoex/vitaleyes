"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Info, Shield, Award, Activity } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const fileInputRef = useRef(null);

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

  const analyzeImage = async () => {
    if (!image) return;
    
    setLoading(true);
    try {
      // Remove the data:image/jpeg;base64, part
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
        {!image ? (
          <div 
            className={styles.uploadArea}
            onClick={() => fileInputRef.current.click()}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.cameraIcon}>
              <Camera size={32} />
            </div>
            <h2 className={styles.uploadTitle}>Haga clic en la cámara para tomar una foto</h2>
            <p className={styles.uploadSubtitle}>O arrastre su macrofotografía aquí</p>
            <button className={styles.uploadButton}>Seleccionar Archivo</button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
              Formatos recomendados: JPEG, PNG • Máx 10 MB
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <img src={image} alt="Iris Preview" className={styles.previewImage} />
            <button 
              className={styles.uploadButton} 
              onClick={() => { setImage(null); setReport(null); }}
            >
              Cambiar Fotografía
            </button>
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
