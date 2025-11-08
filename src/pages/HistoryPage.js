import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabase';
import Spinner from '../components/Spinner';

const HistoryPage = () => {
  const [scans, setScans] = useState([]);
  const [groupedScans, setGroupedScans] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    const fetchAllScans = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch todos los escaneos con detalles de producto, ordenados por tiempo descendente
        const { data, error } = await supabase
          .from('inventory_scans')
          .select(`
            id,
            scanned_quantity,
            scan_time,
            product_id,
            products!inventory_scans_product_id_fkey (
              id, code, name, brand, category, price
            )
          `)
          .order('scan_time', { ascending: false });

        if (error) {
          throw error;
        }

        // Preparar scans con detalles
        const scansWithDetails = (data || []).map(scan => ({
          ...scan,
          scanId: scan.id,
          name: scan.products.name,
          code: scan.products.code,
          brand: scan.products.brand,
          category: scan.products.category,
          fullTime: new Date(scan.scan_time).toLocaleString('es-ES')
        }));

        setScans(scansWithDetails);

        // Agrupar por hora (ej. "14:30")
        const grouped = scansWithDetails.reduce((acc, scan) => {
          const hourKey = new Date(scan.scan_time).toLocaleString('es-ES', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: false 
          });

          if (!acc[hourKey]) {
            acc[hourKey] = [];
          }
          acc[hourKey].push(scan);
          return acc;
        }, {});

        // Ordenar grupos por hora descendente
        const sortedGroups = Object.keys(grouped)
          .sort((a, b) => new Date(`2000-01-01 ${b}`) - new Date(`2000-01-01 ${a}`))
          .reduce((result, key) => {
            result[key] = grouped[key];
            return result;
          }, {});

        setGroupedScans(sortedGroups);
      } catch (error) {
        console.error('Error fetching scans history:', error);
        setError('No se pudo cargar el historial de escaneos.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllScans();
  }, []);

  const toggleGroup = (hourKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [hourKey]: !prev[hourKey]
    }));
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8 text-xl font-medium">{error}</div>;
  }

  const totalScans = scans.length;
  const totalItems = scans.reduce((sum, scan) => sum + scan.scanned_quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Clock className="w-8 h-8 text-purple-600" />
          Historial Completo de Escaneos
        </h1>

        <div className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-purple-50 p-4 rounded-xl">
              <Package className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total Escaneos</h3>
              <p className="text-3xl font-bold text-purple-700">{totalScans}</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total Items</h3>
              <p className="text-3xl font-bold text-pink-700">{totalItems}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl">
              <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-800">Período</h3>
              <p className="text-3xl font-bold text-indigo-700">
                {scans.length > 0 
                  ? `${new Date(scans[scans.length - 1]?.scan_time).toLocaleDateString('es-ES')} - ${new Date(scans[0]?.scan_time).toLocaleDateString('es-ES')}`
                  : 'Sin datos'
                }
              </p>
            </div>
          </div>
        </div>

        {Object.keys(groupedScans).length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl"
          >
            <Clock className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-xl font-semibold text-gray-600">
              No hay historial de escaneos aún.
            </p>
            <p className="text-gray-500 mt-2">
              Empieza a escanear productos para ver el historial agrupado por hora.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedScans).map(([hourKey, groupScans]) => {
              const isExpanded = expandedGroups[hourKey] !== false;
              const groupDate = new Date(groupScans[0].scan_time);
              const groupHour = groupDate.toLocaleString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: false });
              const groupCount = groupScans.length;
              const groupTotalItems = groupScans.reduce((sum, s) => sum + s.scanned_quantity, 0);

              return (
                <motion.div
                  key={hourKey}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                >
                  {/* Header del grupo - clickeable */}
                  <motion.button
                    onClick={() => toggleGroup(hourKey)}
                    className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-between hover:from-purple-600 hover:to-pink-600 transition-all"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5" />
                      <span className="font-semibold">{groupHour}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{groupCount} escaneos</span>
                      <span className="bg-white/20 px-2 py-1 rounded-full">{groupTotalItems} items</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                    </div>
                  </motion.button>

                  {/* Contenido expandible */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-gray-100">
                          {groupScans.map((scan, index) => (
                            <div key={scan.scanId || scan.id} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p className="font-medium text-gray-800 line-clamp-2">
                                    {scan.name}
                                  </p>
                                  <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span className="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                                      {scan.code}
                                    </span>
                                    {scan.brand && <span className="capitalize">{scan.brand}</span>}
                                    {scan.category && <span className="capitalize">({scan.category})</span>}
                                    <span className="ml-auto font-medium">+{scan.scanned_quantity}</span>
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    {scan.fullTime}
                                  </p>
                                </div>
                                {scan.products.price && (
                                  <div className="ml-4 text-right">
                                    <p className="text-sm font-semibold text-green-600">
                                      ${ (scan.scanned_quantity * scan.products.price).toFixed(2) }
                                    </p>
                                    <p className="text-xs text-gray-500">Valor</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Botón Refresh */}
        <motion.button
          onClick={() => window.location.reload()}
          className="mt-8 bg-gray-500 text-white py-3 px-6 rounded-lg flex items-center gap-2 mx-auto hover:bg-gray-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowUp className="w-5 h-5" />
          Refrescar Historial
        </motion.button>
      </motion.div>
    </div>
  );
};

export default HistoryPage;