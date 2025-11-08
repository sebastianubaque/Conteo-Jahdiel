import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Ear, Save, Upload, Trash, CloudUpload, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

const SoundCustomizer = ({ soundType, defaultSound, onSave }) => {
  const [soundUrl, setSoundUrl] = useState(localStorage.getItem(`custom${soundType}Sound`) || defaultSound);
  const [tempUrl, setTempUrl] = useState(soundUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit para sonidos
        alert('El archivo de sonido es demasiado grande (máximo 5MB).');
        e.target.value = null;
        return;
      }

      // Validar tipo de archivo
      if (!['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'].includes(file.type)) {
        alert('Solo se permiten archivos de audio (MP3, WAV, OGG).');
        e.target.value = null;
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        // Subir a Supabase Storage (bucket 'sounds')
        const filePath = `${soundType.toLowerCase()}-custom-${Date.now()}.${file.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sounds') // Usa bucket 'sounds' (créalo en Supabase si no existe, con permisos públicos)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Generar URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('sounds')
          .getPublicUrl(filePath);

        if (publicUrl) {
          setTempUrl(publicUrl);
          setUploadProgress(100);
          alert(`¡Sonido subido a la nube exitosamente! URL: ${publicUrl}`);
        } else {
          throw new Error('No se pudo generar URL pública.');
        }
      } catch (error) {
        alert(`Error subiendo a la nube: ${error.message}. Usa una URL externa.`);
        console.error('Upload error:', error);
      } finally {
        setUploading(false);
        setUploadProgress(0);
        e.target.value = null;
      }
    }
  };

  const handleUrlChange = (e) => {
    setTempUrl(e.target.value);
  };

  const handleSave = () => {
    onSave(soundType, tempUrl);
    setSoundUrl(tempUrl);
  };

  const handleTestSound = () => {
    try {
      const audio = new Audio(tempUrl);
      audio.play().catch(e => {
        alert("No se pudo reproducir. Verifica la URL o el archivo.");
        console.error("Test error:", e);
      });
    } catch (e) {
      alert("Error creando reproductor de audio.");
      console.error("Audio creation error:", e);
    }
  };

  const handleReset = () => {
    const defaultVal = defaultSound;
    setTempUrl(defaultVal);
    setSoundUrl(defaultVal);
    localStorage.removeItem(`custom${soundType}Sound`);
  };

  const handleDeleteCustom = async () => {
    if (!confirm(`¿Borrar sonido personalizado de ${soundType}?`)) return;

    const currentCustom = localStorage.getItem(`custom${soundType}Sound`);
    if (currentCustom && currentCustom.startsWith('https://')) {
      // Si es URL de Supabase, intentar borrar del storage (opcional, ya que es por usuario)
      const fileName = currentCustom.split('/').pop();
      if (fileName) {
        const { error } = await supabase.storage.from('sounds').remove([fileName]);
        if (error) {
          console.warn('No se pudo borrar del storage:', error); // No crítico
        }
      }
    }

    localStorage.removeItem(`custom${soundType}Sound`);
    setTempUrl(defaultSound);
    setSoundUrl(defaultSound);
    alert(`Sonido de ${soundType} reseteado a predeterminado.`);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-xl shadow-inner border border-gray-100 mb-4">
      <h3 className="flex items-center text-lg font-semibold text-gray-700 mb-3">
        <Ear className="w-5 h-5 mr-2 text-indigo-500" />
        Sonido de {soundType === 'Success' ? 'Éxito' : 'Error'}
      </h3>
      
      {/* Input URL */}
      <input
        type="text"
        value={tempUrl}
        onChange={handleUrlChange}
        placeholder="Pega URL de sonido o sube archivo para nube"
        className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-3"
      />
      
      {/* Upload a Nube */}
      <div className="mb-3">
        <input
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <motion.button
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
          className={`w-full bg-blue-100 text-blue-700 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
            uploading ? 'cursor-not-allowed' : 'hover:bg-blue-200'
          }`}
          whileHover={{ scale: uploading ? 1 : 1.05 }}
          whileTap={{ scale: uploading ? 1 : 0.95 }}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subiendo... {uploadProgress}%
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4" />
              Subir a Nube
            </>
          )}
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <motion.button
          onClick={handleTestSound}
          disabled={uploading}
          className="bg-gray-200 text-gray-700 py-2 px-3 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition-colors text-sm disabled:opacity-50"
          whileHover={{ scale: uploading ? 1 : 1.05 }}
          whileTap={{ scale: uploading ? 1 : 0.95 }}
        >
          <Ear className="w-4 h-4" />
          Probar
        </motion.button>
        <motion.button
          onClick={handleSave}
          disabled={uploading}
          className="bg-indigo-600 text-white py-2 px-3 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
          whileHover={{ scale: uploading ? 1 : 1.05 }}
          whileTap={{ scale: uploading ? 1 : 0.95 }}
        >
          <Save className="w-4 h-4" />
          Guardar
        </motion.button>
        <motion.button
          onClick={handleReset}
          className="bg-red-100 text-red-700 py-2 px-3 rounded-lg flex items-center gap-2 hover:bg-red-200 transition-colors text-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash className="w-4 h-4" />
          Reset
        </motion.button>
        {soundUrl.startsWith('https://') && !soundUrl.includes('sounds/success.mp3') && !soundUrl.includes('sounds/error.mp3') && (
          <motion.button
            onClick={handleDeleteCustom}
            className="bg-yellow-100 text-yellow-700 py-2 px-3 rounded-lg flex items-center gap-2 hover:bg-yellow-200 transition-colors text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <CloudUpload className="w-4 h-4" />
            Borrar de Nube
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default SoundCustomizer;