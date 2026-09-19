import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { MeterBarComponent } from '../../shared/components/meter-bar';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { GatewayService } from '../../core/services/gateway.service';
import { Gateway } from '../../core/models/gateway.models';

@Component({
  selector: 'app-gateway-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    MeterBarComponent,
    RelativeTimePipe,
  ],
  templateUrl: './gateway-detail.html',
})
export class GatewayDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(GatewayService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly gateway = signal<Gateway | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get(id).subscribe((g) => this.gateway.set(g ?? null));
  }

  hasGps(g: Gateway): boolean {
    return g.latitude != null && g.longitude != null && Number.isFinite(g.latitude) && Number.isFinite(g.longitude);
  }

  osmEmbedUrl(lat: number, lng: number): SafeResourceUrl {
    const delta = 0.01;
    const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
