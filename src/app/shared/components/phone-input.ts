import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import {
  DEFAULT_PHONE_COUNTRY,
  joinPhone,
  phoneCountryOptions,
  splitPhone,
} from '../../core/utils/phone-countries';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, SelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="phone-input" [class.phone-input--disabled]="disabled">
      <p-select
        [options]="countries"
        [(ngModel)]="countryCode"
        (ngModelChange)="emitValue()"
        optionLabel="label"
        optionValue="value"
        [filter]="true"
        filterPlaceholder="Rechercher un pays…"
        appendTo="body"
        [disabled]="disabled"
        styleClass="phone-input__dial"
        placeholder="🇲🇱 Mali (+223)"
      />
      <input
        pInputText
        class="phone-input__number"
        type="tel"
        inputmode="numeric"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [(ngModel)]="national"
        (ngModelChange)="emitValue()"
        (blur)="onTouched()"
      />
    </div>
  `,
  styles: [
    `
      .phone-input {
        display: grid;
        grid-template-columns: minmax(9.5rem, 12.5rem) minmax(0, 1fr);
        gap: 0.5rem;
        align-items: stretch;
        width: 100%;
      }
      :host ::ng-deep .phone-input__dial {
        width: 100%;
      }
      :host ::ng-deep .phone-input__dial .p-select {
        width: 100%;
      }
      .phone-input__number {
        width: 100%;
        min-width: 0;
      }
      .phone-input--disabled {
        opacity: 0.7;
      }
    `,
  ],
})
export class PhoneInputComponent implements ControlValueAccessor {
  @Input() placeholder = 'Numéro';

  readonly countries = phoneCountryOptions();
  countryCode = DEFAULT_PHONE_COUNTRY;
  national = '';
  disabled = false;

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const parts = splitPhone(value);
    this.countryCode = parts.countryCode;
    this.national = parts.national;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  emitValue(): void {
    this.onChange(joinPhone(this.countryCode, this.national));
  }
}
