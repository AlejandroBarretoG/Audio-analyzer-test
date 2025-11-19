
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a specific video frame and generates a subtitle/description.
 */
export const generateSceneDescription = async (
  base64Image: string
): Promise<string> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            {
              text: "Analyze this movie scene. Write a concise, single-sentence subtitle that describes exactly what is happening visually or what might be said. Keep it under 15 words. Do not add quotes."
            }
          ]
        }
      ],
      config: {
        temperature: 0.4,
        maxOutputTokens: 50,
      }
    });

    if (response.text) {
      return response.text.trim();
    } else {
      throw new Error("No text generated from Gemini.");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Translates a single text.
 */
export const translateText = async (
  text: string,
  targetLanguage: 'Spanish' | 'English'
): Promise<string> => {
  if (!text || !text.trim()) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [{ text: text }]
        }
      ],
      config: {
        systemInstruction: `You are a professional translator. Translate the user text into ${targetLanguage}. 
        - Maintain the original tone, emotion, and brevity. 
        - Output ONLY the translated text.
        - No preamble or explanations.`,
        temperature: 0.3,
        maxOutputTokens: 200,
      }
    });

    if (response.text) {
      return response.text.trim();
    }
    
    throw new Error("Translation returned empty text.");
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};

/**
 * Translates a BATCH of texts in a single API call using structured JSON.
 * This is faster and more reliable than individual calls.
 */
export const translateBatch = async (
  texts: string[],
  targetLanguage: 'Spanish' | 'English'
): Promise<string[]> => {
  if (texts.length === 0) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [{ text: JSON.stringify(texts) }]
        }
      ],
      config: {
        systemInstruction: `You are a professional subtitle translator. 
        Translate the array of strings provided by the user into ${targetLanguage}.
        - Maintain the context of a movie/video script.
        - Return the translations in the EXACT same order as the input.
        - Return strictly a JSON array of strings.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No JSON generated for translation batch.");
  } catch (error) {
    console.error("Batch Translation Error:", error);
    throw error;
  }
};

/**
 * Analyzes audio to extract Scenes, Dialogues, and detailed Music Metrics.
 * Returns a JSON array of segments.
 */
export const analyzeAudioDeeply = async (base64Audio: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'audio/wav',
                data: base64Audio
              }
            },
            {
              text: `
                Analyze this audio track from a video. Break it down into distinct chronological segments based on what is happening (Dialogue vs Music vs Silence).
                
                For DIALOGUE segments:
                - Identify the Speaker (e.g., "Man", "Woman", "Narrator" or name if known).
                - Identify the Emotion.
                - Transcribe the text.

                For MUSIC segments, perform a deep musicology analysis:
                - Music_Source: Diegetic (characters hear it), Non-Diegetic (score), or Silence/Ambient.
                - Music_Tempo: Slow, Medium, Fast.
                - Music_Dynamics: Low, Medium, High.
                - Music_Progression: Crescendo, Diminuendo, or Sustained.
                - Music_HarmonicMode: Major (Optimistic) or Minor (Melancholy/Scary).
                - Music_Sentiment: A number between -1.0 (Fear/Sadness) to 1.0 (Joy/Victory).
                
                Return a JSON object with a "segments" array.
              `
            }
          ]
        }
      ],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.NUMBER, description: "Start time in seconds" },
                  endTime: { type: Type.NUMBER, description: "End time in seconds" },
                  type: { type: Type.STRING, enum: ["dialogue", "music", "silence"] },
                  text: { type: Type.STRING, description: "Transcript or description of sound" },
                  speaker: { type: Type.STRING, nullable: true },
                  emotion: { type: Type.STRING, nullable: true },
                  musicAnalysis: {
                    type: Type.OBJECT,
                    nullable: true,
                    properties: {
                      source: { type: Type.STRING, enum: ["Diegetic", "Non-Diegetic", "Silence/Ambient"] },
                      tempo: { type: Type.STRING, enum: ["Slow", "Medium", "Fast"] },
                      dynamics: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                      progression: { type: Type.STRING, enum: ["Crescendo", "Diminuendo", "Sustained"] },
                      harmonicMode: { type: Type.STRING, enum: ["Major", "Minor"] },
                      sentimentScore: { type: Type.NUMBER, description: "Between -1.0 and 1.0" }
                    }
                  }
                },
                required: ["startTime", "endTime", "type", "text"]
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No JSON generated.");
  } catch (error) {
    console.error("Gemini Audio Analysis Error:", error);
    throw error;
  }
};
