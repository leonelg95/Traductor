import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import translatePkg from '@google-cloud/translate';
import textToSpeechPkg from '@google-cloud/text-to-speech';
import pdfParse from 'pdf-parse';

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

const upload = multer({ dest: 'uploads/' });

const { Translate } = translatePkg.v2; // Extraer Translate de translatePkg.v2
const translate = new Translate();
const { TextToSpeechClient } = textToSpeechPkg; // Extraer TextToSpeechClient de textToSpeechPkg
const client = new TextToSpeechClient();

// Middleware para parsear JSON
app.use(express.json());

// Middleware CORS
app.use(cors());

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;

        // Determinar el tipo de archivo y extraer texto
        let text = '';
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        if (fileExtension === '.txt') {
            text = await fs.promises.readFile(filePath, 'utf8');
        } else if (fileExtension === '.pdf') {
            const dataBuffer = await fs.promises.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            text = data.text;
        } else {
            const worker = Tesseract.createWorker();
            await worker.load();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data: { text: ocrText } } = await worker.recognize(filePath);
            text = ocrText;
            await worker.terminate();
        }

        // Traducir texto
        const [translation] = await translate.translate(text, 'es');

        // Convertir texto a voz
        const request = {
            input: { text: translation },
            voice: { languageCode: 'es-ES', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
        };
        const [response] = await client.synthesizeSpeech(request);
        const audioPath = `uploads/${req.file.filename}.mp3`;
        await util.promisify(fs.writeFile)(audioPath, response.audioContent, 'binary');

        res.json({ translation, audioPath: `http://localhost:${port}/${audioPath}` });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'Error processing file' });
    }
});

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
