import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main id="content" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="tabular text-7xl font-black text-accent">404</p>
      <h1 className="text-2xl font-extrabold">Bu sayfa bulunamadı</h1>
      <p className="text-muted">Aradığın oyun ya da sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <Link to="/dashboard" className="btn btn-primary btn-lg">
        Panele dön
      </Link>
    </main>
  );
}
