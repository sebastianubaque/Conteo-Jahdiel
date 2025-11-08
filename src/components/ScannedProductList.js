import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, Clock, X } from 'lucide-react';

const ScannedProductList = ({ scannedProducts, onRemoveScan }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl p-6 shadow-xl lg:max-h-96 overflow-hidden"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <ListChecks className="w-6 h-6 text-emerald-600" />
        Escaneos Recientes (Últimos 5)
      </h2>
      {scannedProducts.length === 0 ? (
        <p className="text-gray-500 italic">No hay escaneos recientes. ¡Empieza a escanear!</p>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-2 max-h-72"> {/* Altura mayor, scroll si >5 */}
          <AnimatePresence initial={false}>
            {scannedProducts.map((item, index) => (
              <motion.div
                key={item.scanId || item.id || item.scan_time}
                layout
                initial={{ opacity: 0, x: -50, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 50, height: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 25, delay: index * 0.08 }}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-gray-800 text-base line-clamp-2"> {/* Wrap texto, max 2 líneas */}
                    {item.name}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded-sm">
                      {item.code}
                    </span>
                    <span className="font-medium">+{item.scanned_quantity || 1}</span>
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{new Date(item.scan_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {onRemoveScan && (
                    <motion.button
                      onClick={() => onRemoveScan(item.scanId || item.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Eliminar este escaneo"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default ScannedProductList;