import React, { useState } from 'react';
import { HelpCircle, Play, CheckCircle2, RotateCcw, X, Sparkles } from 'lucide-react';
import type { Tutorial } from './tutorialTypes';
import { getCompleted, markCompleted, resetCompleted } from './tutorialProgress';
import { TutorialTour } from './TutorialTour';

export interface ModuleTutorialMenuProps {
  modulo?: string;
  module?: string;
  moduloLabel?: string;
  tutorials: Tutorial[];
  activeTab?: string;
  className?: string;
  onSelectTutorial?: (tutorial: Tutorial) => void;
  runningTutorial?: Tutorial | null;
  onCloseTour?: (completed: boolean) => void;
}

export const ModuleTutorialMenu: React.FC<ModuleTutorialMenuProps> = ({
  modulo: moduloProp,
  module: moduleProp,
  moduloLabel: moduloLabelProp,
  tutorials,
  activeTab,
  className = '',
  onSelectTutorial,
  runningTutorial: controlledRunningTutorial,
  onCloseTour: controlledOnCloseTour,
}) => {
  const modulo = moduloProp || moduleProp || 'general';
  const moduloLabel = moduloLabelProp || (modulo.charAt(0).toUpperCase() + modulo.slice(1));
  const [isOpen, setIsOpen] = useState(false);
  const [internalRunningTutorial, setInternalRunningTutorial] = useState<Tutorial | null>(null);
  const runningTutorial = controlledRunningTutorial !== undefined ? controlledRunningTutorial : internalRunningTutorial;

  const [completedList, setCompletedList] = useState<string[]>(() => getCompleted(modulo));
  const [filterLevel, setFilterLevel] = useState<'all' | 'macro' | 'micro'>('all');

  const total = tutorials.length;
  const doneCount = tutorials.filter((t) => completedList.includes(t.id)).length;

  const currentTabTutorial = tutorials.find((t) => t.tab === activeTab) || tutorials[0];

  const handleStart = (t: Tutorial) => {
    setIsOpen(false);
    if (onSelectTutorial) {
      onSelectTutorial(t);
    } else {
      window.setTimeout(() => {
        setInternalRunningTutorial(t);
      }, 120);
    }
  };

  const handleCloseTour = (completed: boolean) => {
    if (completed && runningTutorial) {
      markCompleted(modulo, runningTutorial.id);
      setCompletedList(getCompleted(modulo));
    }
    if (controlledOnCloseTour) {
      controlledOnCloseTour(completed);
    }
    setInternalRunningTutorial(null);
  };

  const handleReset = () => {
    resetCompleted(modulo);
    setCompletedList([]);
  };

  const macroTutorials = tutorials.filter((t) => t.level === 'macro');
  const microTutorials = tutorials.filter((t) => t.level === 'micro' || !t.level);
  const hasHierarchy = macroTutorials.length > 0 && microTutorials.length > 0;

  const filteredTutorials = tutorials.filter((t) => {
    if (filterLevel === 'macro') return t.level === 'macro';
    if (filterLevel === 'micro') return t.level === 'micro' || !t.level;
    return true;
  });

  return (
    <>
      <div className={`inline-flex items-center ${className}`}>
        {/* Botón unificado de tutoriales: abre el centro de aprendizaje con la lista completa de guías y tours */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={`Ver catálogo de tutoriales de ${moduloLabel}`}
          aria-label={`Abrir centro de tutoriales guiados de ${moduloLabel}`}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
          <HelpCircle size={15} className="text-blue-600" aria-hidden="true" />
          <span>Tutorial</span>
        </button>
      </div>

      {/* Modal / Menú del Centro de Aprendizaje */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header del modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tutoriales Guiados de {moduloLabel}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recorridos interactivos de nivel Macro (pipeline) y Micro (vistas operativas específicas).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Barra de progreso y filtros de jerarquía */}
            <div className="px-6 py-2.5 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-blue-900">
                Progreso:{' '}
                <span className="font-bold text-blue-700">
                  {doneCount} de {total} completados
                </span>
              </span>

              {hasHierarchy && (
                <div className="inline-flex items-center bg-white rounded-lg p-0.5 border border-blue-200/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFilterLevel('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      filterLevel === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({tutorials.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('macro')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      filterLevel === 'macro'
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    Macro ({macroTutorials.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('micro')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      filterLevel === 'micro'
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    Micro ({microTutorials.length})
                  </button>
                </div>
              )}

              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  Reiniciar progreso
                </button>
              )}
            </div>

            {/* Lista de tutoriales disponibles */}
            <div className="p-6 overflow-y-auto space-y-3">
              {filteredTutorials.map((t) => {
                const isDone = completedList.includes(t.id);
                const isCurrentTab = t.tab === activeTab;
                const isMacro = t.level === 'macro';

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      isCurrentTab
                        ? 'border-blue-300 bg-blue-50/30 ring-1 ring-blue-300'
                        : isMacro
                        ? 'border-purple-200/80 bg-purple-50/20 hover:border-purple-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {t.title}
                        </h4>
                        {isMacro ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            Nivel Macro
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            Nivel Micro
                          </span>
                        )}
                        {isCurrentTab && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            Vista actual
                          </span>
                        )}
                        {isDone && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={13} />
                            Completado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {t.summary}
                      </p>
                      <span className="mt-2 inline-block text-[10px] font-semibold text-slate-400">
                        {t.steps.length} pasos explicados
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStart(t)}
                      className={`h-9 px-4 shrink-0 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer ${
                        isDone
                          ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          : isMacro
                          ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                      }`}
                    >
                      <Play size={13} aria-hidden="true" />
                      {isDone ? 'Repetir' : 'Iniciar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* Tour activo si está en ejecución (solo en modo no delegado para evitar tours duplicados) */}
      {!onSelectTutorial && runningTutorial && (
        <TutorialTour
          key={runningTutorial.id}
          tutorial={runningTutorial}
          onClose={handleCloseTour}
        />
      )}
    </>
  );
};
