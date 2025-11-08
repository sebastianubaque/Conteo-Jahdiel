import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, DollarSign, Package, Tag, Layers, ShoppingCart, TrendingUp } from 'lucide-react';
import { supabase } from '../services/supabase';
import Spinner from '../components/Spinner';

const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');
      if (productsError) throw productsError;

      // Fetch all scans
      const { data: scansData, error: scansError } = await supabase
        .from('inventory_scans')
        .select('product_id, scanned_quantity');
      if (scansError) throw scansError;

      // Calculate aggregated data
      let totalProducts = productsData.length;
      let totalScannedItems = 0;
      let totalCostValue = 0;
      let totalPriceValue = 0;

      const productsByBrand = {};
      const productsByCategory = {};

      const productsWithCurrentQuantity = productsData.map(product => {
        const productScans = scansData.filter(scan => scan.product_id === product.id);
        const totalScannedForProduct = productScans.reduce((sum, scan) => sum + scan.scanned_quantity, 0);
        
        const current_quantity = product.initial_quantity + totalScannedForProduct;
        totalScannedItems += totalScannedForProduct;
        totalCostValue += current_quantity * (product.cost || 0);
        totalPriceValue += current_quantity * (product.price || 0);

        // Aggregate by brand
        if (product.brand) {
          productsByBrand[product.brand] = (productsByBrand[product.brand] || 0) + current_quantity;
        }
        // Aggregate by category
        if (product.category) {
          productsByCategory[product.category] = (productsByCategory[product.category] || 0) + current_quantity;
        }

        return { ...product, current_quantity };
      });

      setStats({
        totalProducts: totalProducts,
        totalScannedItems: totalScannedItems,
        totalCostValue: totalCostValue.toFixed(2),
        totalPriceValue: totalPriceValue.toFixed(2),
        brandsCount: Object.keys(productsByBrand).length,
        categoriesCount: Object.keys(productsByCategory).length,
        productsByBrand: productsByBrand,
        productsByCategory: productsByCategory,
      });

    } catch (e) {
      console.error('Error fetching statistics:', e);
      setError('No se pudieron cargar las estadísticas. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8 text-xl font-medium">{error}</div>;
  }

  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl max-w-7xl mx-auto mt-8"
      >
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-xl font-semibold text-gray-600">
          Parece que no hay datos para mostrar estadísticas.
        </p>
        <p className="text-gray-500 mt-2">
          Sube un archivo Excel y empieza a escanear productos.
        </p>
      </motion.div>
    );
  }

  const renderSection = (title, icon, data, formatter = (val) => val) => (
    <motion.div
      className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
      <ul className="space-y-2">
        {Object.entries(data).sort(([, a], [, b]) => b - a).map(([key, value]) => (
          <li key={key} className="flex justify-between items-center text-gray-700">
            <span>{key}</span>
            <span className="font-semibold text-indigo-600">{formatter(value)}</span>
          </li>
        ))}
        {Object.keys(data).length === 0 && <li className="text-gray-500 italic">No hay datos.</li>}
      </ul>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <BarChart2 className="w-8 h-8 text-teal-600" />
          Estadísticas de Inventario
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Package className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Productos Únicos</p>
              <h2 className="text-3xl font-bold text-gray-800">{stats.totalProducts}</h2>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-3 bg-emerald-100 rounded-xl">
              <ShoppingCart className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Escaneados</p>
              <h2 className="text-3xl font-bold text-gray-800">{stats.totalScannedItems}</h2>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Valor Total (Venta)</p>
              <h2 className="text-3xl font-bold text-gray-800">${stats.totalPriceValue}</h2>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="p-3 bg-rose-100 rounded-xl">
              <DollarSign className="w-8 h-8 text-rose-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Costo Total</p>
              <h2 className="text-3xl font-bold text-gray-800">${stats.totalCostValue}</h2>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderSection('Cantidad por Marca', <Tag className="w-5 h-5 text-blue-600" />, stats.productsByBrand)}
          {renderSection('Cantidad por Categoría', <Layers className="w-5 h-5 text-green-600" />, stats.productsByCategory)}
        </div>
      </motion.div>
    </div>
  );
};

export default StatisticsPage;