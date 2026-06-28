import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
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
`;

export async function POST(req) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ 
        error: 'API Key not configured. Please set OPENROUTER_API_KEY in your environment variables.' 
      }, { status: 500 });
    }

    const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    const prompt = "Actúa como experto iridólogo siguiendo el protocolo clínico sistémico. Analiza esta imagen del iris, determina la densidad del estroma, e identifica posibles signos estructurales como lagunas, criptas o anillos de tensión. Genera el reporte estructurado.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vitaleyes.app", // Adjust if needed
        "X-Title": "VitalEyes", // Adjust if needed
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenRouter Error:", errorData);
      return NextResponse.json({ error: 'Error communicating with AI service' }, { status: 502 });
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "No se pudo generar el reporte.";

    return NextResponse.json({ report: resultText });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json({ error: 'Error analyzing image: ' + error.message }, { status: 500 });
  }
}
