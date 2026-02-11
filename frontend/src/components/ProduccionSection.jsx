import React from 'react';
import ProduccionEdicion from './ProduccionEdicion';

export default function ProduccionSection({ onClose }) {
  // Directamente abrimos la herramienta de edición sin paso intermedio
  return <ProduccionEdicion onClose={onClose} />;
}
