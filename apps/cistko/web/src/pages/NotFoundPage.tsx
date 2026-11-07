import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="ck-wrap mt-16 grid max-w-xl gap-4 text-center">
      <h1 className="text-3xl font-semibold">Ova stranica ne postoji</h1>
      <p className="ck-muted">Možda je poveznica zastarjela.</p>
      <Link to="/" className="ck-btn mx-auto">
        Na naslovnicu
      </Link>
    </div>
  );
}
