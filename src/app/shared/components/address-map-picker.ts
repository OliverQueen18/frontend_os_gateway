import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import * as L from 'leaflet';

export interface AddressGeoValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

const BAMAKO: L.LatLngExpression = [12.6392, -8.0029];

@Component({
  selector: 'app-address-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
  template: `
    <div class="address-map" [class.address-map--disabled]="disabled">
      <label class="address-map__field">
        <span>Adresse du point de vente</span>
        <div class="address-map__search">
          <input
            pInputText
            class="address-map__input"
            type="text"
            [(ngModel)]="address"
            [placeholder]="placeholder"
            [disabled]="disabled"
            (ngModelChange)="onAddressTyped($event)"
            (keydown.enter)="$event.preventDefault(); geocodeAddress()"
            (blur)="onAddressBlur()"
          />
          <button
            pButton
            type="button"
            class="p-button-outlined"
            icon="pi pi-map-marker"
            [label]="searching ? '…' : 'Localiser'"
            [disabled]="disabled || searching || !address.trim()"
            (click)="geocodeAddress()"
          ></button>
        </div>
      </label>
      <p class="address-map__hint muted">
        Saisissez une adresse pour placer le marqueur (coordonnées GPS automatiques), ou cliquez sur la carte.
      </p>
      <div #mapHost class="address-map__canvas"></div>
      @if (latitude != null && longitude != null) {
        <p class="address-map__gps">
          GPS : {{ latitude | number: '1.5-6' }}, {{ longitude | number: '1.5-6' }}
        </p>
      }
      @if (searchError) {
        <small class="field-error">{{ searchError }}</small>
      }
    </div>
  `,
  styles: [
    `
      .address-map {
        display: grid;
        gap: 0.55rem;
        width: 100%;
      }
      .address-map__field {
        display: grid;
        gap: 0.35rem;
      }
      .address-map__field > span {
        font-size: 0.8rem;
        font-weight: 600;
        color: #334155;
      }
      .address-map__search {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.5rem;
        align-items: center;
      }
      .address-map__input {
        width: 100%;
      }
      .address-map__hint {
        margin: 0;
        font-size: 0.78rem;
      }
      .address-map__gps {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--p-primary-color, #1e3a5f);
      }
      .address-map__canvas {
        height: 280px;
        min-height: 280px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--p-content-border-color, #d5dde5);
        z-index: 0;
        background: #e8eef3;
      }
      .address-map--disabled {
        opacity: 0.75;
        pointer-events: none;
      }
      :host ::ng-deep .leaflet-container {
        width: 100%;
        height: 100%;
        font: inherit;
      }
    `,
  ],
})
export class AddressMapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;
  @Input() placeholder = 'Ex. Hamdallaye ACI 2000, Bamako';
  @Input() disabled = false;
  @Input() address = '';
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Output() readonly geoChange = new EventEmitter<AddressGeoValue>();
  @Output() readonly touched = new EventEmitter<void>();

  searching = false;
  searchError = '';

  private map?: L.Map;
  private marker?: L.Marker;
  private ready = false;
  private geocodeTimer: ReturnType<typeof setTimeout> | null = null;
  private skipNextAddressSync = false;
  private lastGeocodedQuery = '';
  private readonly markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  });

  ngAfterViewInit(): void {
    this.initMap();
    this.ready = true;
    this.syncMarkerFromInputs(true);
    setTimeout(() => this.map?.invalidateSize(), 120);
    setTimeout(() => this.map?.invalidateSize(), 400);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.ready) return;
    if (changes['address'] && !changes['address'].firstChange) {
      const next = String(changes['address'].currentValue ?? '');
      if (this.skipNextAddressSync) {
        this.skipNextAddressSync = false;
      } else if (next !== this.address) {
        this.address = next;
      }
    }
    if (changes['latitude'] || changes['longitude']) {
      this.syncMarkerFromInputs(false);
    }
    if (changes['disabled']) {
      this.syncInteraction();
    }
  }

  ngOnDestroy(): void {
    this.clearGeocodeTimer();
    this.map?.remove();
    this.map = undefined;
  }

  /** Call after dialog opens so Leaflet recalculates size. */
  refreshSize(): void {
    const host = this.mapHost?.nativeElement;
    if (!host) return;
    if (!this.map) {
      this.initMap();
      this.ready = true;
      this.syncMarkerFromInputs(true);
    }
    host.style.minHeight = '280px';
    setTimeout(() => this.map?.invalidateSize(true), 50);
    setTimeout(() => this.map?.invalidateSize(true), 250);
  }

  onAddressTyped(value: string): void {
    this.address = value;
    this.emitChange();
    this.scheduleGeocode();
  }

  onAddressBlur(): void {
    this.touched.emit();
    void this.geocodeAddress();
  }

  async geocodeAddress(): Promise<void> {
    this.clearGeocodeTimer();
    const q = this.address.trim();
    if (!q) {
      this.searchError = 'Saisissez une adresse à localiser';
      return;
    }
    if (q === this.lastGeocodedQuery && this.latitude != null && this.longitude != null) {
      return;
    }
    this.searching = true;
    this.searchError = '';
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?' +
        new URLSearchParams({
          q,
          format: 'json',
          limit: '1',
          addressdetails: '0',
          countrycodes: 'ml',
        }).toString();
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'fr',
        },
      });
      if (!res.ok) throw new Error('Recherche indisponible');
      const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!rows.length) {
        this.searchError = 'Aucun résultat pour cette adresse';
        return;
      }
      this.skipNextAddressSync = true;
      this.address = rows[0].display_name || q;
      this.lastGeocodedQuery = this.address.trim();
      this.setMarker(Number(rows[0].lat), Number(rows[0].lon), true);
    } catch {
      this.searchError = 'Échec de la localisation (réseau / Nominatim)';
    } finally {
      this.searching = false;
    }
  }

  emitChange(): void {
    this.latitude = this.latitude == null ? null : Number(this.latitude);
    this.longitude = this.longitude == null ? null : Number(this.longitude);
    this.geoChange.emit({
      address: this.address?.trim() ?? '',
      latitude: this.latitude,
      longitude: this.longitude,
    });
  }

  private scheduleGeocode(): void {
    this.clearGeocodeTimer();
    const q = this.address.trim();
    if (q.length < 5) return;
    this.geocodeTimer = setTimeout(() => {
      void this.geocodeAddress();
    }, 900);
  }

  private clearGeocodeTimer(): void {
    if (this.geocodeTimer != null) {
      clearTimeout(this.geocodeTimer);
      this.geocodeTimer = null;
    }
  }

  private initMap(): void {
    const host = this.mapHost?.nativeElement;
    if (!host || this.map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: this.markerIcon.options.iconUrl,
      iconRetinaUrl: this.markerIcon.options.iconRetinaUrl,
      shadowUrl: this.markerIcon.options.shadowUrl,
    });

    this.map = L.map(host, {
      center: BAMAKO,
      zoom: 12,
      zoomControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.disabled) return;
      this.setMarker(e.latlng.lat, e.latlng.lng, false);
      void this.reverseGeocode(e.latlng.lat, e.latlng.lng);
      this.touched.emit();
    });
    this.syncInteraction();
  }

  private syncInteraction(): void {
    if (!this.map) return;
    if (this.disabled) {
      this.map.dragging.disable();
      this.map.scrollWheelZoom.disable();
    } else {
      this.map.dragging.enable();
      this.map.scrollWheelZoom.enable();
    }
  }

  private syncMarkerFromInputs(fly: boolean): void {
    if (this.latitude != null && this.longitude != null) {
      this.setMarker(Number(this.latitude), Number(this.longitude), fly);
    } else if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = undefined;
      this.map.setView(BAMAKO, 12);
    }
  }

  private setMarker(lat: number, lng: number, fly: boolean): void {
    if (!this.map) return;
    this.latitude = Number(lat.toFixed(6));
    this.longitude = Number(lng.toFixed(6));
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { icon: this.markerIcon }).addTo(this.map);
    }
    if (fly) {
      this.map.setView([lat, lng], Math.max(this.map.getZoom(), 14));
    }
    this.map.invalidateSize();
    this.emitChange();
  }

  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    try {
      const url =
        'https://nominatim.openstreetmap.org/reverse?' +
        new URLSearchParams({
          lat: String(lat),
          lon: String(lng),
          format: 'json',
        }).toString();
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'fr',
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { display_name?: string };
      if (data.display_name) {
        this.skipNextAddressSync = true;
        this.address = data.display_name;
        this.lastGeocodedQuery = data.display_name.trim();
        this.emitChange();
      }
    } catch {
      // keep coords even if reverse fails
    }
  }
}
