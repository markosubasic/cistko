import { Link } from 'react-router-dom';

const LAYERS: [string, string, string][] = [
  [
    'odbaceni_otpad',
    'Lokacije odbačenog otpada (Evidencija lokacija odbačenog otpada, ELOO)',
    'bez datuma po zapisu',
  ],
  [
    'jls_stopa_odv_otp_2022',
    'JLS, stopa odvajanja komunalnog otpada u okviru javne usluge (%)',
    '2022.',
  ],
  ['jls_stopa_odvajanja_poticajna_2019', 'JLS, stopa odvajanja poticajna', '2019.'],
  ['stopa_rec_zup_2022', 'Županije, stopa recikliranja komunalnog otpada (%)', '2022.'],
  ['rd_stacion_pt_2018', 'Reciklažna dvorišta, stacionarna', '2018.'],
  ['akt_odlag_2026', 'Odlagališta s aktivnom dozvolom gospodarenja otpadom', '2026.'],
  ['sortirnice_2026', 'Sortirnice', '2026.'],
  ['cgo_2026', 'Centri za gospodarenje otpadom', '2026.'],
  ['kompostane_2025', 'Kompostane', '2025.'],
  ['depo_speleo_2025', 'Divlji deponiji otpada u speleološkim objektima', '2025.'],
];

export function MethodologyPage() {
  return (
    <div className="ck-wrap mt-8 grid max-w-3xl gap-6">
      <header>
        <p className="ck-eyebrow">Kako računamo</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Podaci, izračuni i ograničenja
        </h1>
      </header>
      <section className="ck-card ck-card-pad grid gap-3">
        <h2 className="ck-h2">Odakle su podaci</h2>
        <p>
          Svi podaci dolaze iz baze „Gospodarenje otpadom” Ministarstva zaštite okoliša i
          energetike, objavljene na{' '}
          <a className="underline" href="https://data.gov.hr/ckan/dataset/gospodarenje-otpadom-wfs">
            Portalu otvorenih podataka
          </a>{' '}
          kao WFS servis (servisi.azo.hr/otpad/wfs). Čistko ih jednom preuzima i sprema u PostgreSQL
          s PostGIS-om; vrijeme preuzimanja je na stranici{' '}
          <Link to="/izvori" className="underline">
            Izvori
          </Link>
          .
        </p>
        <div className="overflow-x-auto">
          <table className="ck-table">
            <thead>
              <tr>
                <th scope="col">Sloj</th>
                <th scope="col">Sadržaj</th>
                <th scope="col">Godina</th>
              </tr>
            </thead>
            <tbody>
              {LAYERS.map(([id, label, year]) => (
                <tr key={id}>
                  <td className="font-mono text-xs">{id}</td>
                  <td>{label}</td>
                  <td>{year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ck-card ck-card-pad grid gap-3">
        <h2 className="ck-h2">Što znače brojke</h2>
        <ul className="grid list-disc gap-2 pl-5">
          <li>
            <strong>Stopa odvajanja</strong> je udio odvojeno prikupljenog komunalnog otpada u
            ukupnom komunalnom otpadu prikupljenom u javnoj usluzi, kako ga objavljuje Ministarstvo.
            Za 2019. Čistko provjerava da je jednaka zbroju odvojeno prikupljenog otpada
            (uključujući reciklažna dvorišta) podijeljenom s ukupnim.
          </li>
          <li>
            <strong>Rang</strong> je mjesto općine po stopi za 2022. među svim jedinicama u
            Hrvatskoj, odnosno u županiji; jednake stope dijele mjesto. Stopa 0 % znači da u javnoj
            usluzi nije prijavljen odvojeno prikupljen otpad (za većinu takvih jedinica i 2019. je
            sav otpad bio miješan). <strong>Medijan</strong> je vrijednost „tipične” općine.
          </li>
          <li>
            <strong>Cilj EU od 55 %</strong> (Direktiva (EU) 2018/851) odnosi se na pripremu za
            ponovnu uporabu i recikliranje komunalnog otpada, pa ga Čistko prikazuje samo uz
            županijsku stopu recikliranja, ne uz stopu odvajanja općine.
          </li>
          <li>
            <strong>Status lokacije</strong> je onaj iz evidencije: „Otpad na lokaciji”, „Prijavljen
            otpad na lokaciji od strane javnosti” ili „Uklonjen otpad”. Lokacija je pridružena
            općini u čijim se granicama nalazi.
          </li>
          <li>
            <strong>Vrsta otpada</strong> je u evidenciji slobodan tekst; Čistko ga ključnim
            riječima svrstava u osam skupina (glomazni, miješani komunalni, građevni, opasni, vozila
            i gume, električni, ostalo, nije navedeno).
          </li>
        </ul>
      </section>
      <section className="ck-card ck-card-pad grid gap-3">
        <h2 className="ck-h2">Ograničenja</h2>
        <ul className="grid list-disc gap-2 pl-5">
          <li>
            Evidencija pokazuje koliko se prijavljuje, ne koliko je otpada. Grad Zagreb upisuje
            većinu svih lokacija; mnoge općine nemaju nijednu. Zato Čistko ne rangira općine po
            broju lokacija, nego po odvajanju i udjelu uklonjenog.
          </li>
          <li>Zapisi evidencije nemaju datum, pa se ne može prikazati kretanje kroz vrijeme.</li>
          <li>Količine i površine su procjene osobe koja je lokaciju upisala.</li>
          <li>Popis reciklažnih dvorišta je iz 2018.; noviji sloj nije objavljen u servisu.</li>
          <li>Fotografije se učitavaju izravno s poslužitelja evidencije (eloo.haop.hr).</li>
        </ul>
      </section>
    </div>
  );
}
