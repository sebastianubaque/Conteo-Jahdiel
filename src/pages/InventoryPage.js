import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Trash2 as Trash, BarChart3, Search as SearchIcon,
  Filter, RotateCcw, AlertCircle, History, Settings, LineChart, X
} from 'lucide-react';
import { supabase } from '../services/supabase';
import ProductCard from '../components/ProductCard';
import ScannerInput from '../components/ScannerInput';
import Spinner from '../components/Spinner';
import ScannedProductList from '../components/ScannedProductList';
import SoundCustomizer from '../components/SoundCustomizer';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { playSound } from '../utils/audioPlayer';
import { useNavigate } from 'react-router-dom';

const normalizeCode = (code) => {
  return (code || '').toString().trim().toUpperCase();
};

const normalizeString = (str) => {
  return (str || '').toString().trim().toLowerCase();
};

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [totalScannedCount, setTotalScannedCount] = useState(0);
  const [scannedProductsLive, setScannedProductsLive] = useState([]);
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        setLoading(false);
        return;
      }

      const { data: allScans, error: allScansError } = await supabase
        .from('inventory_scans')
        .select('*');

      if (allScansError) {
        console.error('Error fetching all scans:', allScansError);
      }

      const { data: recentScansData, error: recentScansError } = await supabase
        .from('inventory_scans')
        .select(`
          id,
          scanned_quantity,
          scan_time,
          product_id,
          products!inventory_scans_product_id_fkey (
            id,
            code,
            name,
            brand,
            category
          )
        `)
        .order('scan_time', { ascending: false })
        .limit(5);

      if (recentScansError) {
        console.error('Error fetching recent scans:', recentScansError);
      }

      const totalScannedFromDB = allScans ? allScans.reduce((sum, scan) => sum + scan.scanned_quantity, 0) : 0;
      setTotalScannedCount(totalScannedFromDB);

      const brandSet = new Set();
      const categorySet = new Set();

      const productQuantities = productsData.map(product => {
        const normalizedBrand = normalizeString(product.brand);
        const normalizedCategory = normalizeString(product.category);

        if (normalizedBrand) {
          brandSet.add(normalizedBrand);
        }
        if (normalizedCategory) {
          categorySet.add(normalizedCategory);
        }

        const productScans = allScans ? allScans.filter(scan => scan.product_id === product.id) : [];
        const totalScannedForProduct = productScans.reduce((sum, scan) => sum + scan.scanned_quantity, 0);

        return { 
          ...product, 
          current_quantity: product.initial_quantity + totalScannedForProduct,
          normalizedBrand,
          normalizedCategory,
          normalizedCode: normalizeCode(product.code)
        };
      });

      const recentScansWithDetails = recentScansData ? recentScansData.map(scan => ({
        ...scan,
        scanId: scan.id,
        scan_time: scan.scan_time,
        name: scan.products.name,
        code: scan.products.code,
        brand: scan.products.brand,
        category: scan.products.category
      })) : [];

      setScannedProductsLive(recentScansWithDetails);

      setProducts(productQuantities);
      setAllBrands([...brandSet]);
      setAllCategories([...categorySet]);
      setLoading(false);

      console.log(`Carga completa: ${productsData.length} productos, total escaneados: ${totalScannedFromDB}`);
    } catch (error) {
      console.error('Error en fetchProducts:', error);
      setLoading(false);
      alert('Error cargando datos: ' + error.message);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSoundSave = (type, url) => {
    localStorage.setItem(`custom${type}Sound`, url);
  };

  const handleClearScans = async () => {
    if (!window.confirm('¿Borrar todos los escaneos? Esto reseteará el conteo a cero, pero mantendrá los productos.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('inventory_scans').delete();
      if (error) {
        throw error;
      }
      alert('¡Escaneos borrados! Conteo reseteado.');
      setTotalScannedCount(0);
      setScannedProductsLive([]);
      // Refrescar productos para resetear current_quantity a initial
      await fetchProducts();
    } catch (error) {
      alert('Error borrando escaneos: ' + error.message);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm('¿Borrar TODO?')) return;
    setLoading(true);
    try {
      await supabase.from('inventory_scans').delete();
      await supabase.from('products').delete();
      await supabase.from('uploads_history').delete();

      alert('¡Borrado OK!');
      setScannedProductsLive([]);
      setProducts([]);
      setTotalScannedCount(0);
      setAllBrands([]);
      setAllCategories([]);
    } catch (error) {
      alert('Error borrando: ' + error.message);
    } finally {
      setLoading(false);
      fetchProducts();
    }
  };

  const handleDownloadExcel = () => {
    const dataToExport = products.map(p => ({
      'Código': p.code,
      'Nombre': p.name,
      'Cantidad Inicial': p.initial_quantity,
      'Cantidad Escaneada': (p.current_quantity - p.initial_quantity),
      'Stock Total': p.current_quantity,
      'Marca': p.brand,
      'Categoría': p.category,
      'Costo': p.cost,
      'Precio': p.price,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario_Actualizado');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'inventario_recontado.xlsx');
  };

  const handleScanProduct = async (code) => {
    const normalizedCode = normalizeCode(code);

    let foundProduct = products.find(p => p.normalizedCode === normalizedCode);

    if (!foundProduct) {
      const { data: dbProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('code', normalizedCode)
        .single();

      if (fetchError || !dbProduct) {
        playSound('Error');
        alert(`Código "${code}" no encontrado.`);
        return;
      }

      foundProduct = { ...dbProduct, normalizedCode, current_quantity: dbProduct.initial_quantity };
      setProducts(prev => [...prev, foundProduct]);
    }

    const { data: scanData, error: scanError } = await supabase
      .from('inventory_scans')
      .insert([{ product_id: foundProduct.id, scanned_quantity: 1 }])
      .select()
      .single();

    if (scanError) {
      playSound('Error');
      alert('Error escaneando: ' + scanError.message);
    } else {
      playSound('Success');
      
      setTotalScannedCount(prev => prev + 1);
      await updateRecentScans();

      setProducts(prevProducts => prevProducts.map(p => 
        p.id === foundProduct.id 
          ? { ...p, current_quantity: (p.current_quantity || p.initial_quantity) + 1 } 
          : p
      ));
    }
  };

  const updateRecentScans = async () => {
    const { data: recentScansData, error } = await supabase
      .from('inventory_scans')
      .select(`
        id,
        scanned_quantity,
        scan_time,
        product_id,
        products (id, code, name, brand, category)
      `)
      .order('scan_time', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error recent scans:', error);
      return;
    }

    const recentScansWithDetails = recentScansData ? recentScansData.map(scan => ({
      ...scan,
      scanId: scan.id,
      scan_time: scan.scan_time,
      name: scan.products.name,
      code: scan.products.code,
      brand: scan.products.brand,
      category: scan.products.category
    })) : [];

    setScannedProductsLive(recentScansWithDetails);
  };

  const handleRemoveScan = async (scanId) => {
    if (!confirm('¿Borrar escaneo?')) return;

    const { error } = await supabase
      .from('inventory_scans')
      .delete()
      .eq('id', scanId);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setTotalScannedCount(prev => Math.max(0, prev - 1));
      await updateRecentScans();
      await fetchProducts();
      alert('Borrado.');
    }
  };

  const handleToggleBrandFilter = (brand) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleToggleCategoryFilter = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSearchTerm('');
  };

  const filteredProducts = products.filter(p => {
    const searchLower = normalizeString(searchTerm);
    const codeMatch = normalizeString(p.code).includes(searchLower);
    const nameMatch = normalizeString(p.name).includes(searchLower);
    const brandMatch = p.normalizedBrand?.includes(searchLower) || false;
    const categoryMatch = p.normalizedCategory?.includes(searchLower) || false;
    
    const searchMatches = codeMatch || nameMatch || brandMatch || categoryMatch;

    const brandFilterMatch = selectedBrands.length === 0 || selectedBrands.includes(p.normalizedBrand);
    const categoryFilterMatch = selectedCategories.length === 0 || selectedCategories.includes(p.normalizedCategory);

    return searchMatches && brandFilterMatch && categoryFilterMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Reconteo Jahdiel
          </h1>
          <div className="flex flex-wrap gap-3">
            <motion.button
              onClick={handleDownloadExcel}
              className="bg-blue-500 text-white py-3 px-5 rounded-lg shadow-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="w-5 h-5" />
              Descargar Reconteo
            </motion.button>
            <motion.button
              onClick={() => navigate('/history')}
              className="bg-purple-500 text-white py-3 px-5 rounded-lg shadow-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <History className="w-5 h-5" />
              <span className="hidden md:inline">Historial de Escaneos</span>
            </motion.button>
            <motion.button
              onClick={() => navigate('/statistics')}
              className="bg-teal-500 text-white py-3 px-5 rounded-lg shadow-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LineChart className="w-5 h-5" />
              Estadísticas
            </motion.button>
            <motion.button
              onClick={() => setShowSoundSettings(!showSoundSettings)}
              className="bg-orange-500 text-white py-3 px-5 rounded-lg shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5" />
              Sonidos
            </motion.button>
            <motion.button
              onClick={handleClearScans}
              className="bg-red-400 text-white py-3 px-5 rounded-lg shadow-lg hover:bg-red-500 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-5 h-5" />
              Borrar Escaneos
            </motion.button>
            <motion.button
              onClick={handleDeleteAllData}
              className="bg-red-600 text-white py-3 px-5 rounded-lg shadow-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash className="w-5 h-5" />
              Borrar Todo
            </motion.button>
          </div>
        </div>

        <ScannerInput onScanProduct={handleScanProduct} />

        <AnimatePresence>
          {showSoundSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl p-6 mb-8 shadow-xl"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuración de Sonidos</h2>
              <SoundCustomizer soundType="Success" defaultSound="/sounds/success.mp3" onSave={handleSoundSave} />
              <SoundCustomizer soundType="Error" defaultSound="/sounds/error.mp3" onSave={handleSoundSave} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BarChart3 className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-gray-500 font-medium">Total de Productos Escaneados:</p>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {totalScannedCount}
                  </h2>
                </div>
              </div>
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className="mt-4 md:mt-0 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Filter className="w-5 h-5" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </motion.button>
            </div>
          </div>
          <ScannedProductList 
            scannedProducts={scannedProductsLive} 
            onRemoveScan={handleRemoveScan}
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl p-6 mb-8 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
                <div className="relative flex-1 w-full">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por código, nombre, marca o categoría... (insensible a mayúsculas)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <motion.button
                  onClick={clearFilters}
                  className="bg-yellow-100 text-yellow-700 py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-yellow-200 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RotateCcw className="w-5 h-5" />
                  Limpiar Filtros
                </motion.button>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Marcas ({allBrands.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {allBrands.map(brand => (
                    <motion.button
                      key={brand}
                      onClick={() => handleToggleBrandFilter(brand)}
                      className={`py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                        selectedBrands.includes(brand) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {brand} <span className="ml-1 text-xs">({products.filter(p => p.normalizedBrand === brand).length})</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Categorías ({allCategories.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map(category => (
                    <motion.button
                      key={category}
                      onClick={() => handleToggleCategoryFilter(category)}
                      className={`py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                        selectedCategories.includes(category) ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {category} <span className="ml-1 text-xs">({products.filter(p => p.normalizedCategory === category).length})</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <Spinner />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onScan={() => handleScanProduct(product.code)}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-xl"
                >
                  <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-xl font-semibold text-gray-600">
                    No se encontraron productos que coincidan.
                  </p>
                  <p className="text-gray-500 mt-2">
                    Ajusta búsqueda o contacta para cargar datos.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default InventoryPage;