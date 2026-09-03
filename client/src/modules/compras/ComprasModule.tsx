import { useState } from 'react';
import { comprasMenuItems } from './ComprasMenu.Config';
import EstadosPage from './EstadosPage';
import EnConstruccion from './EnConstruccion';

// Mapa: key del menú -> componente real ya implementado.
// Cuando un compañero termine su CRUD, solo agrega su entrada aquí.
const paginasImplementadas: Record<string, React.ReactNode> = {
  estados: <EstadosPage />,
};

export default function ComprasModule() {
  const [seleccion, setSeleccion] = useState('estados');

  const itemSeleccionado = comprasMenuItems.find((item) => item.key === seleccion);
  const contenido = paginasImplementadas[seleccion] ?? (
    <EnConstruccion nombre={itemSeleccionado?.label ?? ''} />
  );

  const grupos: Array<'Catálogos' | 'Procesos'> = ['Catálogos', 'Procesos'];

  return (
    <div>
      <div className="breadcrumb">Módulo de Adquisiciones / Compras</div>
      <h1 className="page-title">{itemSeleccionado?.label}</h1>

      <div className="compras-layout">
        <nav className="compras-submenu">
          {grupos.map((grupo) => (
            <div key={grupo} className="compras-submenu-group">
              <div className="compras-submenu-group-title">{grupo}</div>
              {comprasMenuItems
                .filter((item) => item.grupo === grupo)
                .map((item) => (
                  <button
                    key={item.key}
                    className={`compras-submenu-item${item.key === seleccion ? ' active' : ''}`}
                    onClick={() => setSeleccion(item.key)}
                  >
                    {item.label}
                    {!paginasImplementadas[item.key] && (
                      <span className="compras-submenu-badge">Pendiente</span>
                    )}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <div className="compras-content">{contenido}</div>
      </div>
    </div>
  );
}