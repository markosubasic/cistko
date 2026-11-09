import { DataSourcesPage } from '@dt/ui';

const LAYERS: [string, string, string][] = [
  [
    'odbaceni_otpad',
    'Lokacije odbačenog otpada (Evidencija lokacija odbačenog otpada, ELOO)',
    'snimka oko veljače 2024.',
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
        <h1 className="text-[2rem] sm:text-[2.75rem]">O podacima</h1>
        <p className="ck-lead mt-3">
          Odakle su brojke, kako ih računamo i što iz njih ne treba zaključivati.
        </p>
      </header>
      <section className="ck-story grid gap-3 border-t border-[#111] pt-5">
        <h2 className="ck-h2">Odakle su podaci</h2>
        <p>
          Svi podaci dolaze iz baze „Gospodarenje otpadom” Ministarstva zaštite okoliša i
          energetike, objavljene na{' '}
          <a className="underline" href="https://data.gov.hr/ckan/dataset/gospodarenje-otpadom-wfs">
            Portalu otvorenih podataka
          </a>{' '}
          kao WFS servis (servisi.azo.hr/otpad/wfs). Čistko ih jednom preuzima i sprema u PostgreSQL
          s PostGIS-om; vrijeme preuzimanja je na dnu stranice.
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
      <section className="ck-story grid gap-3 border-t border-[#111] pt-5">
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
            otpad na lokaciji od strane javnosti” ili „Uklonjen otpad”. Čistko ga ne provjerava na
            terenu: „uklonjeno” znači da je lokacija tako označena u evidenciji. Evidencija nema
            datum uklanjanja, a usporedba sa živom evidencijom (9. 11. 2026.) pokazuje da su se od
            objave snimke statusi mijenjali, npr. oko 219 lokacija s otpadom u međuvremenu je
            označeno kao uklonjeno. Lokacija je pridružena općini u čijim se granicama nalazi.
          </li>
          <li>
            <strong>Vrsta otpada</strong> je u evidenciji slobodan tekst; Čistko ga ključnim
            riječima svrstava u osam skupina (glomazni, miješani komunalni, građevni, opasni, vozila
            i gume, električni, ostalo, nije navedeno).
          </li>
        </ul>
      </section>
      <section className="ck-story grid gap-3 border-t border-[#111] pt-5">
        <h2 className="ck-h2">Ograničenja</h2>
        <ul className="grid list-disc gap-2 pl-5">
          <li>
            Evidencija pokazuje koliko se prijavljuje, ne koliko je otpada. Grad Zagreb upisuje
            većinu svih lokacija; mnoge općine nemaju nijednu. Zato Čistko ne rangira općine po
            broju lokacija, nego po odvajanju i udjelu uklonjenog.
          </li>
          <li>
            Zapisi evidencije nemaju datum. Objavljeni sloj je snimka iz približno veljače 2024.
            (procjena prema datumima u opisima i datumima snimanja fotografija), a 9. 11. 2026. u
            servisu je i dalje nepromijenjen. Živa evidencija na eloo.haop.hr danas ima oko 20.300
            javnih lokacija, pa novije prijave i naknadna čišćenja ovdje nisu vidljiva.
          </li>
          <li>Količine i površine su procjene osobe koja je lokaciju upisala.</li>
          <li>Popis reciklažnih dvorišta je iz 2018.; noviji sloj nije objavljen u servisu.</li>
          <li>
            Fotografije su s poslužitelja evidencije (eloo.haop.hr); Čistko ih preuzima i poslužuje
            sa svoje adrese.
          </li>
        </ul>
      </section>
      <section id="izvori" className="border-t border-[#111] pt-5">
        <DataSourcesPage title="Izvori i vrijeme preuzimanja" />
      </section>
    </div>
  );
}
