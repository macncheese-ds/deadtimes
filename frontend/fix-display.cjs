const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/DisplayVisualization.jsx');

let content = fs.readFileSync(file, 'utf8');

// Colors
content = content.replace(/bg-gray-900/g, 'bg-neutral-950');
content = content.replace(/bg-gray-800/g, 'bg-neutral-900');
content = content.replace(/text-gray-300/g, 'text-neutral-300');
content = content.replace(/text-gray-400/g, 'text-neutral-400');
content = content.replace(/text-gray-200/g, 'text-neutral-200');

// Timers logic in getTimeColor
content = content.replace(/bg-green-900 text-green-200/g, 'bg-neutral-800 border border-neutral-700 text-neutral-200');
content = content.replace(/bg-yellow-900 text-yellow-200/g, 'bg-neutral-700 border border-neutral-600 text-white font-medium');
content = content.replace(/bg-red-900 text-red-200/g, 'bg-white text-black font-bold shadow-md shadow-white/20');

// Overlays
content = content.replace(/bg-blue-600\/30/g, 'bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 shadow-2xl');
content = content.replace(/animate-pulse-blue/g, 'animate-pulse-white');
content = content.replace(/bg-amber-500\/30/g, 'bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 shadow-2xl');
content = content.replace(/animate-pulse-orange/g, 'animate-pulse-white');
content = content.replace(/bg-purple-600\/30/g, 'bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 shadow-2xl');
content = content.replace(/animate-pulse-purple/g, 'animate-pulse-white');

// New ticket rings
content = content.replace(/ring-yellow-400 shadow-yellow-400\/50/g, 'ring-white shadow-white/50');
content = content.replace(/text-yellow-300/g, 'text-white');

// Text color changes inside overlay to ensure high contrast
content = content.replace(/text-neutral-200 drop-shadow-2xl/g, 'text-white drop-shadow-2xl tracking-widest');

fs.writeFileSync(file, content, 'utf8');
console.log('Update successful');
