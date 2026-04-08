const fs = require('fs');
const path = require('path');

const homePath = path.join(__dirname, 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(homePath, 'utf8');

// The section we want to replace starts exactly here:
const startIndex = content.indexOf('<div className="min-h-screen bg-slate-900 p-3 sm:p-4 lg:p-6">');
// And we want to replace everything up until `{!showNew && !showOpen`
const endIndex = content.indexOf('{!showNew && !showOpen', startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find layout blocks to replace!");
  process.exit(1);
}

// We will construct the new layout
const newLayout = `<div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-200">
      {/* Sidebar Navigation */}
      <aside className="w-16 sm:w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col z-20 shrink-0 transition-all duration-300">
        <div className="h-16 flex items-center justify-center sm:justify-start sm:px-6 border-b border-neutral-800 px-0">
          <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="ml-3 font-bold text-white tracking-tight hidden sm:block truncate">Downtime Manager</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2 sm:px-3">
          <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:block mb-1 mt-2">Principal</p>
          <button onClick={toggleNew} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${showNew ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.newTicket')}</span>
          </button>
          <button onClick={toggleOpen} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${showOpen ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.open')}</span>
          </button>
          <button onClick={toggleClosed} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${showClosed ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.closed')}</span>
          </button>
          <button onClick={toggleProduccion} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${showProduccion ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.produccion')}</span>
          </button>

          <div className="mt-4 mb-1">
             <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:block">Herramientas</p>
             <div className="h-px bg-neutral-800 mx-3 my-2 sm:hidden"></div>
          </div>
          
          <button onClick={() => { setShowAnalytics(true); setShowNew(false); setShowOpen(false); setShowClosed(false); setShowProduccion(false); setShowConfiguration(false); setShowDisplay(false); setShowMantenimiento(false); setShowCambioModelo(false); setShowAuditoria(false); resetFilters(); }} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${showAnalytics ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.analytics')}</span>
          </button>
          
          <button onClick={() => { setShowConfiguration(true); setShowNew(false); setShowOpen(false); setShowClosed(false); setShowProduccion(false); setShowAnalytics(false); setShowDisplay(false); setShowMantenimiento(false); setShowCambioModelo(false); setShowAuditoria(false); resetFilters(); }} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${showConfiguration ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.configuration')}</span>
          </button>
          
          <button onClick={() => { setShowDisplay(true); setShowConfiguration(false); setShowNew(false); setShowOpen(false); setShowClosed(false); setShowProduccion(false); setShowAnalytics(false); setShowMantenimiento(false); setShowCambioModelo(false); setShowAuditoria(false); resetFilters(); }} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${showDisplay ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
             <span className="text-sm hidden sm:block">{t('nav.display')}</span>
          </button>

          <div className="mt-4 mb-1">
             <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:block">Estados</p>
             <div className="h-px bg-neutral-800 mx-3 my-2 sm:hidden"></div>
          </div>
          
          <button onClick={() => toggleMantenimiento()} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${Object.values(mantenimientoActivo).includes(true) ? 'bg-neutral-200 text-black font-semibold shadow-md' : showMantenimiento ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.maintenance')}</span>
          </button>
          <button onClick={() => toggleCambioModelo()} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${Object.values(cambioModeloActivo).includes(true) ? 'bg-neutral-200 text-black font-semibold shadow-md' : showCambioModelo ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.modelChange')}</span>
          </button>
          <button onClick={() => toggleAuditoria()} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors \${Object.values(auditoriaActivo).includes(true) ? 'bg-neutral-200 text-black font-semibold shadow-md' : showAuditoria ? 'bg-white text-black font-semibold shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}\`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <span className="text-sm hidden sm:block">{t('nav.audit')}</span>
          </button>
        </div>
        
        <div className="p-2 sm:p-4 border-t border-neutral-800 hidden sm:block">
          <LanguageSwitcher className="w-full justify-center" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-neutral-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1920px] mx-auto pb-12">
        
        `;

const beforeContent = content.substring(0, startIndex);
const afterContent = content.substring(endIndex);

let newContent = beforeContent + newLayout + afterContent;

// Properly add </main> to close `<main>` before the outermost `</div>` closes.
// Replacing:
//      )}
//    </div>
//  )
//}
const endRegex = /<\/div>\s*\)\s*}\s*$/;
newContent = newContent.replace(endRegex, '    </main>\n  </div>\n  )\n}\n');

// 2. Global replace of colors
newContent = newContent.replace(/\bbg-slate-900\b/g, 'bg-neutral-950');
newContent = newContent.replace(/\bbg-slate-800\b/g, 'bg-neutral-900');
newContent = newContent.replace(/\bbg-slate-700\b/g, 'bg-neutral-800');
newContent = newContent.replace(/\bbg-slate-600\b/g, 'bg-neutral-700');
newContent = newContent.replace(/\bbg-slate-500\b/g, 'bg-neutral-600');
newContent = newContent.replace(/\bbg-slate-400\b/g, 'bg-neutral-500');

newContent = newContent.replace(/\bborder-slate-800\b/g, 'border-neutral-900');
newContent = newContent.replace(/\bborder-slate-700\b/g, 'border-neutral-800');
newContent = newContent.replace(/\bborder-slate-600\b/g, 'border-neutral-700');
newContent = newContent.replace(/\bborder-slate-500\b/g, 'border-neutral-600');

newContent = newContent.replace(/\btext-slate-500\b/g, 'text-neutral-500');
newContent = newContent.replace(/\btext-slate-400\b/g, 'text-neutral-400');
newContent = newContent.replace(/\btext-slate-300\b/g, 'text-neutral-300');
newContent = newContent.replace(/\btext-slate-200\b/g, 'text-neutral-200');

// Replace vibrant buttons with highly readable contrast buttons
newContent = newContent.replace(/bg-amber-600 hover:bg-amber-500/g, 'bg-white text-black hover:bg-neutral-200');
newContent = newContent.replace(/bg-blue-600 hover:bg-blue-500/g, 'bg-white text-black hover:bg-neutral-200');
newContent = newContent.replace(/bg-emerald-600 hover:bg-emerald-500/g, 'bg-white text-black hover:bg-neutral-200');
newContent = newContent.replace(/bg-red-600 hover:bg-red-500/g, 'bg-black text-white hover:bg-neutral-900 border border-neutral-700');
newContent = newContent.replace(/bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400/g, 'bg-white text-black hover:bg-neutral-200');

newContent = newContent.replace(/shadow-emerald-500\/20/g, 'border border-transparent');
newContent = newContent.replace(/shadow-amber-500\/50/g, 'shadow-md shadow-black/50 border border-neutral-700');
newContent = newContent.replace(/shadow-blue-500\/50/g, 'shadow-md shadow-black/50 border border-neutral-700');
newContent = newContent.replace(/shadow-purple-500\/50/g, 'shadow-md shadow-black/50 border border-neutral-700');

newContent = newContent.replace(/\btext-amber-[3456]00\b/g, 'text-neutral-200');
newContent = newContent.replace(/\btext-cyan-[3456]00\b/g, 'text-neutral-200');
newContent = newContent.replace(/\btext-blue-[3456]00\b/g, 'text-neutral-200');
newContent = newContent.replace(/\btext-emerald-[3456]00\b/g, 'text-neutral-200');
newContent = newContent.replace(/\btext-purple-[3456]00\b/g, 'text-neutral-200');
newContent = newContent.replace(/\btext-indigo-[3456]00\b/g, 'text-neutral-200');

newContent = newContent.replace(/\bbg-amber-[89]00\/[0-9]+\b/g, 'bg-neutral-800');
newContent = newContent.replace(/\bbg-blue-[89]00\/[0-9]+\b/g, 'bg-neutral-800');
newContent = newContent.replace(/\bbg-emerald-[89]00\/[0-9]+\b/g, 'bg-neutral-800');
newContent = newContent.replace(/\bbg-purple-[89]00\/[0-9]+\b/g, 'bg-neutral-800');
newContent = newContent.replace(/\bbg-cyan-[89]00\/[0-9]+\b/g, 'bg-neutral-800');

newContent = newContent.replace(/\bborder-emerald-[34567]00\/?[0-9]*\b/g, 'border-neutral-700');
newContent = newContent.replace(/\bborder-amber-[34567]00\/?[0-9]*\b/g, 'border-neutral-700');
newContent = newContent.replace(/\bborder-blue-[34567]00\/?[0-9]*\b/g, 'border-neutral-700');
newContent = newContent.replace(/\bborder-purple-[34567]00\/?[0-9]*\b/g, 'border-neutral-700');
newContent = newContent.replace(/\bborder-cyan-[34567]00\/?[0-9]*\b/g, 'border-neutral-700');
newContent = newContent.replace(/\bborder-red-[34567]00\/?[0-9]*\b/g, 'border-neutral-700');

// Catch a few more blue/amber instances
newContent = newContent.replace(/\bbg-blue-600\b/g, 'bg-neutral-200 text-black');
newContent = newContent.replace(/\bbg-amber-600\b/g, 'bg-neutral-200 text-black');
newContent = newContent.replace(/\bbg-purple-600\b/g, 'bg-neutral-200 text-black');

newContent = newContent.replace(/border-t-slate-400/g, 'border-t-neutral-400');

// Fix accidental text-black text-white classes
newContent = newContent.replace(/text-black text-white/g, 'text-black');
newContent = newContent.replace(/text-white text-black/g, 'text-black');

fs.writeFileSync(homePath, newContent, 'utf8');
console.log('Home.jsx layout and colors successfully replaced!');
