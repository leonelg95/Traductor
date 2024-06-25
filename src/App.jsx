import React, { useState } from 'react';
import axios from 'axios';

function App() {
    const [file, setFile] = useState(null);
    const [translation, setTranslation] = useState('');
    const [audioUrl, setAudioUrl] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:3001/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setTranslation(response.data.translation);
            setAudioUrl(response.data.audioPath);
        } catch (error) {
            console.error('There was an error uploading the file!', error);
            alert('There was an error uploading the file!');
        }
    };

    return (
        <div>
            <h1>Traductor de Documentos</h1>
            <form onSubmit={handleSubmit}>
                <input type="file" onChange={handleFileChange} />
                <button type="submit">Subir y Traducir</button>
            </form>
            {translation && (
                <div>
                    <h2>Traducción:</h2>
                    <p>{translation}</p>
                </div>
            )}
            {audioUrl && (
                <div>
                    <h2>Audio:</h2>
                    <audio controls src={audioUrl}></audio>
                </div>
            )}
        </div>
    );
}

export default App;
