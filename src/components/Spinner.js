import React from 'react';
import { motion } from 'framer-motion';
 
const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <motion.div
        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};
 
export default Spinner;