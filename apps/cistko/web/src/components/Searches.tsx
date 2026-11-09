import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { countyLabel, fullName, pct } from '../lib/format';
import type { GeocodeItem, MunicipalityHit } from '../lib/types';
import { SearchBox } from './SearchBox';

export function AddressSearch({
  hideLabel,
  autoFocus,
}: {
  hideLabel?: boolean;
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <SearchBox<GeocodeItem>
      label="Tvoja adresa"
      hideLabel={hideLabel}
      autoFocus={autoFocus}
      placeholder="npr. Ilica 242, Zagreb"
      queryKey="geocode"
      fetcher={async (q, signal) => (await api.geocode(q, signal)).results}
      itemKey={(item, i) => `${item.lat},${item.lon},${i}`}
      itemText={(item) => item.title}
      renderItem={(item) => (
        <>
          <span className="block font-medium">{item.title}</span>
          <span className="block truncate text-sm text-[#5f5f5f]">{item.label}</span>
        </>
      )}
      onSelect={(item) =>
        navigate(
          `/adresa?lat=${item.lat.toFixed(5)}&lon=${item.lon.toFixed(5)}&q=${encodeURIComponent(item.title)}`,
        )
      }
      emptyText="Nismo našli tu adresu. Pokušaj s ulicom, kućnim brojem i mjestom."
      footer={() => (
        <p className="border-t border-[#d6d6d6] px-4 py-2 text-xs text-[#5f5f5f]">
          Pretraga adresa: © OpenStreetMap (Nominatim)
        </p>
      )}
    />
  );
}

export function MunicipalitySearch({ hideLabel }: { hideLabel?: boolean }) {
  const navigate = useNavigate();
  return (
    <SearchBox<MunicipalityHit>
      label="Općina ili grad"
      hideLabel={hideLabel}
      minChars={2}
      placeholder="npr. Varaždin, Belica, Split"
      queryKey="municipalities"
      fetcher={async (q, signal) => (await api.searchMunicipalities(q, signal)).results}
      itemKey={(item) => item.mb}
      itemText={(item) => item.name}
      renderItem={(item) => (
        <span className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-medium">{fullName(item.kind, item.name)}</span>
            <span className="block text-sm text-[#5f5f5f]">{countyLabel(item.county)}</span>
          </span>
          <span className="ck-num text-sm font-semibold">{pct(item.sep_2022)}</span>
        </span>
      )}
      onSelect={(item) => navigate(`/opcina/${item.mb}`)}
      emptyText="Nema općine ili grada s tim imenom."
    />
  );
}
