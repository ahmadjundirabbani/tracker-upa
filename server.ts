import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Initialize Gemini API client on server-side
  let ai: any = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API router setup FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/insights", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY || !ai) {
        return res.status(500).json({ error: "Gemini API Key is not configured in Secrets." });
      }

      const { activities, targets, name } = req.body;

      const prompt = `Anda adalah seorang Penasihat Ibadah AI yang sangat ramah, memotivasi, dan bijaksana.
Tugas Anda adalah memberikan "Insight Laporan Progress Tracker Ibadah" periodik (daily/weekly) untuk pengguna bernama ${name || 'Hamba Allah'}.

Berikut adalah data target ibadah yang dipasang pengguna:
${JSON.stringify(targets, null, 2)}

Berikut adalah catatan aktivitas pelaksanaan ibadah periodik terakhir dari pengguna:
${JSON.stringify(activities, null, 2)}

Berikan analisis komprehensif dalam Bahasa Indonesia yang ramah degan format markdown yang terstruktur rapi:
1. **Apresiasi Hangat & Motivasi**: Berikan apresiasi setulus hati atas pencapaian ibadah mereka. Berikan kata-kata motivasi islami yang menyejukkan.
2. **Analisis Konsistensi**: Ulas ibadah mana yang berjalan sangat konsisten (sudah mencapai atau mendekati target) dan mana yang memerlukan dorongan ekstra untuk dicapai.
3. **Insight Spiritual**: Hubungkan kebiasaan ibadah harian mereka dengan ketenangan batin, kesehatan mental (spiritual wellness), dan produktivitas hidup sehari-hari.
4. **Tips & Rencana Aksi Praktis Mingguan**: 2-3 langkah konkret, kecil, dan mudah diimplementasikan agar mereka bisa melunasi ibadah yang tertinggal atau mendongkrak pencapaiannya di masa mendatang.

Format dengan markdown indah dan beri emoji islami secukupnya (seperti 🕌, 📖, ✨, 🤲, 📈) agar visual laporan sangat interaktif dan menyenangkan dibaca.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ insights: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error?.message || "Gagal menghasilkan analisis AI." });
    }
  });

  // Vite middleware or static files serving
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode serving built assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server runs on port ${PORT}`);
  });
}

startServer();
