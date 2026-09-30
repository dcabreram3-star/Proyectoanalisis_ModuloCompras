import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface AutocompleteSelectProps {
  options: any[];
  value: any;
  onChange: (val: any) => void;
  placeholder: string;
  displayKey: string;
  valueKey: string;
  isReadOnly?: boolean;
}

/**
 * Desplegable con buscador (escribe para filtrar la lista). Es el mismo comportamiento
 * que ya usaban MovimientoModal y SolicitudCreacionView por su cuenta, ahora en un solo
 * lugar para poder reutilizarlo en cualquier módulo (ej. Lote) sin volver a copiarlo.
 */
export const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  displayKey,
  valueKey,
  isReadOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt[valueKey] === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      String(opt[displayKey]).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(opt[valueKey]).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`w-full h-9 px-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 ${
          isReadOnly ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'cursor-pointer'
        }`}
        onClick={() => {
          if (isReadOnly) return;
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
      >
        <span
          className={`text-sm truncate ${selectedOption ? 'text-slate-800' : 'text-slate-500'}`}
          title={selectedOption ? `${selectedOption[valueKey]} - ${selectedOption[displayKey]}` : undefined}
        >
          {selectedOption ? `${selectedOption[valueKey]} - ${selectedOption[displayKey]}` : placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-500 shrink-0" />
      </div>

      {isOpen && !isReadOnly && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 text-slate-500">
            <Search size={16} />
            <input
              type="text"
              autoFocus
              className="w-full text-sm outline-none text-slate-800"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ul className="overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <li
                  key={opt[valueKey]}
                  className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
                  onClick={() => {
                    onChange(opt[valueKey]);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="font-semibold">{opt[valueKey]}</span> - {opt[displayKey]}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500">Sin resultados.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};