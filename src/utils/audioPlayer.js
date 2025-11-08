import { supabase } from '../services/supabase';

export const getSoundUrl = (type) => {
  // Si no hay un sonido personalizado guardado, usamos los predeterminados.
  const defaultSuccess = '/sounds/success.mp3';
  const defaultError = '/sounds/error.mp3';
  
  // Obtener la URL guardada del localStorage
  const customSound = localStorage.getItem(`custom${type}Sound`);

  if (customSound) {
    return customSound;
  } else if (type === 'Success') {
    return defaultSuccess;
  } else if (type === 'Error') {
    return defaultError;
  }
  return ''; // Fallback
};

export const playSound = (type) => {
  const url = getSoundUrl(type);
  if (!url) {
    console.warn(`No URL found for sound type: ${type}`);
    return;
  }
  try {
    const audio = new Audio(url);
    audio.play().catch(e => {
      console.error(`Error playing ${type} sound from ${url}:`, e);
      // Fallback a predeterminado si falla custom
      const fallbackUrl = type === 'Success' ? '/sounds/success.mp3' : '/sounds/error.mp3';
      const fallbackAudio = new Audio(fallbackUrl);
      fallbackAudio.play().catch(fbErr => console.error('Fallback sound error:', fbErr));
    });
  } catch (e) {
    console.error(`Error creating audio object for ${type} sound from ${url}:`, e);
  }
};

// Función para limpiar sonidos antiguos (opcional, llamar si quieres gestión)
export const cleanupOldSounds = async () => {
  const { data, error } = await supabase.storage.from('sounds').list('', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'asc' }
  });
  if (error) {
    console.error('Error listando sonidos:', error);
    return;
  }
  // Lógica para borrar antiguos > 30 días, etc. (implementar según necesites)
  console.log('Sonidos en nube:', data);
};