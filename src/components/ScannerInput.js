import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scan, CircleSlash, CheckCircle } from 'lucide-react';

const ScannerInput = ({ onScanProduct }) => {
  const [productCode, setProductCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);
  const lastInputTimeRef = useRef(0);

  // Función central para resetear focus y estado (llamar siempre que termine escaneo)
  const resetInputFocus = () => {
    const input = inputRef.current;
    if (input) {
      setProductCode(''); // Limpiar inmediatamente
      setProcessing(false);
      setIsScanning(false);
      input.focus();
      input.select(); // Seleccionar todo para sobrescribir instantáneo en próximo escaneo
    }
  };

  useEffect(() => {
    // Enfocar al montar
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }

    // Vigilancia: Mantener focus siempre (si se pierde por clic o navegación interna)
    const handleFocusOutside = () => {
      if (inputRef.current && !processing) {
        requestAnimationFrame(() => {
          inputRef.current.focus();
          inputRef.current.select();
        });
      }
    };

    document.addEventListener('click', handleFocusOutside);
    document.addEventListener('mousedown', handleFocusOutside); // Cubre mousedown también

    // Limpiar timeout al desmontar
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.removeEventListener('click', handleFocusOutside);
      document.removeEventListener('mousedown', handleFocusOutside);
    };
  }, [processing]); // Re-ejecutar si cambia processing

  const handleInputChange = (e) => {
    const value = e.target.value;
    const now = Date.now();
    setProductCode(value);
    setIsScanning(true); // UI: mostrar que está "escuchando"
    setProcessing(false);
    lastInputTimeRef.current = now; // Registrar última escritura

    // Cancelar timeout anterior para reprogramar inmediatamente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // AUTOMÁTICO: Detectar pausa muy corta después de escribir (para escáneres sin Enter)
    // Solo procesar si ha pasado tiempo suficiente sin nueva escritura
    timeoutRef.current = setTimeout(() => {
      if (value.trim() && !processing && (Date.now() - lastInputTimeRef.current >= 50)) {
        handleScan();
      }
    }, 50); // 50ms: súper rápido para pistolas, procesa al instante tras pausa mínima
  };

  const handleScan = async () => {
    if (!productCode.trim() || processing) return;

    setProcessing(true);
    setIsScanning(false); // Parar UI de escaneo

    try {
      // Llamar al escaneo del padre (automático)
      await onScanProduct(productCode.trim());
      
      // Reset inmediato: limpiar y focus al instante (sin delay perceptible)
      requestAnimationFrame(() => {
        resetInputFocus(); // Enfocar y seleccionar inmediatamente
      });
    } catch (error) {
      console.error('Error en escaneo automático:', error);
      
      // Reset incluso en error: focus listo para continuar
      requestAnimationFrame(() => {
        resetInputFocus();
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevenir scroll
      // Si Enter llega (algunas pistolas lo envían), procesar inmediatamente
      if (productCode.trim() && !processing) {
        clearTimeout(timeoutRef.current); // Cancelar timeout y procesar ya
        handleScan();
      }
    }
  };

  return (
    <motion.div
      className={`flex gap-3 mb-8 p-4 bg-white rounded-xl shadow-md border-2 items-center transition-all duration-200 ${
        isScanning ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50' : 
        processing ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50' :
        'border-gray-200'
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center gap-2">
        <Scan className={`w-6 h-6 transition-colors ${
          isScanning ? 'text-indigo-500 animate-pulse' : 
          processing ? 'text-emerald-500' : 'text-indigo-400'
        }`} />
        {processing && <CheckCircle className="w-5 h-5 text-emerald-500 animate-bounce" />}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={productCode}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Pasa la pistola... (focus siempre listo - escanea seguido sin tocar)"
        className="flex-1 p-3 border-0 rounded-lg focus:outline-none focus:ring-0 bg-transparent text-lg font-mono transition-all min-w-0"
        autoFocus
        autoComplete="off" // Prevenir autosuggest
        disabled={processing} // Prevenir input durante procesamiento
      />
      <motion.button
        type="button"
        onClick={handleScan}
        disabled={!productCode.trim() || processing}
        className={`px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium ${
          !productCode.trim() || processing 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        whileHover={{ scale: (!productCode.trim() || processing) ? 1 : 1.05 }}
        whileTap={{ scale: (!productCode.trim() || processing) ? 1 : 0.95 }}
      >
        <CircleSlash className="w-5 h-5" />
        <span className="hidden sm:inline">Manual</span>
      </motion.button>
    </motion.div>
  );
};

export default ScannerInput;