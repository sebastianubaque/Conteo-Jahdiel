import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

const ProductCard = ({ product, onScan }) => {
  const normalizedCode = (product.normalizedCode || product.code.toUpperCase().trim()); // Fallback

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-shadow"
    >
      <div>
        <h3 className="text-xl font-semibold text-gray-800 flex items-center justify-between">
          <span className="truncate max-w-[70%]">{product.name}</span>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            product.current_quantity > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-700'
          }`}>
            {product.current_quantity || 0}
          </span>
        </h3>
        <p className="text-sm text-gray-500 mb-2 font-mono">
          Código: <span className="font-semibold">{normalizedCode}</span>
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-4">
          {product.brand && <span className="bg-gray-50 px-2 py-0.5 rounded">Marca: {product.brand}</span>}
          {product.category && <span className="bg-blue-50 px-2 py-0.5 rounded">Cat: {product.category}</span>}
          {product.price && <span className="bg-green-50 px-2 py-0.5 rounded">Precio: ${product.price.toFixed(2)}</span>}
          {product.cost && <span className="bg-red-50 px-2 py-0.5 rounded">Costo: ${product.cost.toFixed(2)}</span>}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <motion.button
          onClick={() => onScan(product.code)} // Pasar code original (BD lo tiene normalizado)
          className="flex-1 bg-green-500 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`Escanear ${product.name} (código: ${normalizedCode})`}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Escanear</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProductCard;