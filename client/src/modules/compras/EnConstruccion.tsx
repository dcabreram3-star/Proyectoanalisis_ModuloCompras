interface EnConstruccionProps {
  nombre: string;
}

export default function EnConstruccion({ nombre }: EnConstruccionProps) {
  return (
    <div className="card">
      <div className="card-body empty-state">
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{nombre}</p>
        <p style={{ margin: 0 }}>Este catálogo/proceso todavía no ha sido implementado por el equipo.</p>
      </div>
    </div>
  );
}