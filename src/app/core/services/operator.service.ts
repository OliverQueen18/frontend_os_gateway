import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { Operator, OperatorRequest, BalancePattern, UssdStep, UssdTemplate } from '../models/user.models';

/** Nested (legacy) or flat (current) template payload from ussd-service. */
interface TemplateApi {
  id?: number;
  operatorId?: number;
  transactionType?: string;
  name?: string;
  description?: string;
  active?: boolean;
  steps?: TemplateStepApi[];
  template?: {
    id?: number;
    operatorId?: number;
    transactionType?: string;
    name?: string;
    description?: string;
    active?: boolean;
  };
}

interface TemplateStepApi {
  id?: number;
  stepOrder?: number;
  action?: string;
  expression?: string;
  expectedPattern?: string;
  extractVar?: string;
  waitMillis?: number;
}

export interface UssdTemplatePayload {
  operatorId: number;
  operatorCode: string;
  transactionType: string;
  name: string;
  description?: string;
  active?: boolean;
  steps: UssdStep[];
}

@Injectable({ providedIn: 'root' })
export class OperatorService {
  private readonly http = inject(HttpClient);

  list(active?: boolean): Observable<Operator[]> {
    const options =
      active == null
        ? undefined
        : { params: { active: String(active) } as Record<string, string> };
    return this.http
      .get<ApiResponse<Operator[]>>(`${environment.apiUrl}/ussd/operators`, options)
      .pipe(map((res) => this.unwrapList(res)));
  }

  create(request: OperatorRequest): Observable<Operator> {
    return this.http
      .post<ApiResponse<Operator>>(`${environment.apiUrl}/ussd/operators`, {
        code: request.code,
        name: request.name,
        active: request.active ?? true,
        logoUrl: request.logoUrl || undefined,
      })
      .pipe(map((res) => this.requireData(res, 'Opérateur non enregistré')));
  }

  update(id: number, request: OperatorRequest): Observable<Operator> {
    return this.http
      .put<ApiResponse<Operator>>(`${environment.apiUrl}/ussd/operators/${id}`, {
        code: request.code,
        name: request.name,
        active: request.active ?? true,
        logoUrl: request.logoUrl ?? '',
      })
      .pipe(map((res) => this.requireData(res, 'Opérateur non mis à jour')));
  }

  uploadLogo(id: number, file: File): Observable<Operator> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<ApiResponse<Operator>>(`${environment.apiUrl}/ussd/operators/${id}/logo`, body)
      .pipe(map((res) => this.requireData(res, 'Logo non uploadé')));
  }

  logoSrc(op: Operator): string | null {
    if (!op.logoUrl) return null;
    if (op.logoUrl.startsWith('http://') || op.logoUrl.startsWith('https://')) return op.logoUrl;
    if (op.logoUrl.startsWith('/api/')) {
      const base = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
      return `${base}${op.logoUrl}`;
    }
    return `${environment.apiUrl}${op.logoUrl.startsWith('/') ? '' : '/'}${op.logoUrl}`;
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/ussd/operators/${id}`)
      .pipe(map(() => undefined));
  }

  templates(operatorCode: string, operatorId?: number): Observable<UssdTemplate[]> {
    const params: Record<string, string> = {};
    if (operatorId != null) {
      params['operatorId'] = String(operatorId);
    }
    return this.http
      .get<ApiResponse<TemplateApi[]>>(`${environment.apiUrl}/ussd/templates`, { params })
      .pipe(
        map((res) =>
          this.unwrapList(res)
            .map((row) => this.mapDetail(row, operatorCode))
            .filter((t): t is UssdTemplate => t != null),
        ),
      );
  }

  createTemplate(input: UssdTemplatePayload): Observable<UssdTemplate> {
    return this.http
      .post<ApiResponse<TemplateApi>>(`${environment.apiUrl}/ussd/templates`, this.toApiBody(input))
      .pipe(map((res) => this.mapSaved(res, input)));
  }

  updateTemplate(id: number, input: UssdTemplatePayload): Observable<UssdTemplate> {
    return this.http
      .put<ApiResponse<TemplateApi>>(`${environment.apiUrl}/ussd/templates/${id}`, this.toApiBody(input))
      .pipe(map((res) => this.mapSaved(res, input, id)));
  }

  deleteTemplate(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/ussd/templates/${id}`)
      .pipe(map(() => undefined));
  }

  balancePatterns(operatorId: number): Observable<BalancePattern[]> {
    return this.http
      .get<ApiResponse<BalancePattern[]>>(
        `${environment.apiUrl}/ussd/operators/${operatorId}/balance-patterns`,
      )
      .pipe(map((res) => this.unwrapList(res)));
  }

  saveBalancePatterns(operatorId: number, patterns: BalancePattern[]): Observable<BalancePattern[]> {
    return this.http
      .put<ApiResponse<BalancePattern[]>>(
        `${environment.apiUrl}/ussd/operators/${operatorId}/balance-patterns`,
        patterns.map((p) => ({
          fieldType: p.fieldType,
          regexPattern: p.regexPattern,
          priority: p.priority ?? 10,
          active: p.active ?? true,
          description: p.description ?? null,
        })),
      )
      .pipe(map((res) => this.unwrapList(res)));
  }

  private mapSaved(
    res: ApiResponse<TemplateApi> | TemplateApi,
    input: UssdTemplatePayload,
    fallbackId?: number,
  ): UssdTemplate {
    const mapped = this.mapDetail(this.unwrapData(res), input.operatorCode);
    if (mapped) {
      return {
        ...mapped,
        operatorCode: input.operatorCode,
        steps: mapped.steps?.length ? mapped.steps : input.steps,
        template: mapped.steps?.length ? mapped.template : this.summarizeSteps(input.steps),
      };
    }
    return {
      id: fallbackId ?? 0,
      operatorId: input.operatorId,
      operatorCode: input.operatorCode,
      transactionType: input.transactionType,
      name: input.name,
      description: input.description,
      template: this.summarizeSteps(input.steps),
      active: input.active ?? true,
      steps: input.steps,
    };
  }

  private toApiBody(input: UssdTemplatePayload) {
    return {
      template: {
        operatorId: input.operatorId,
        transactionType: input.transactionType,
        name: input.name,
        description: input.description ?? '',
        active: input.active ?? true,
      },
      steps: (input.steps ?? []).map((s, index) => ({
        stepOrder: index + 1,
        action: (s.action || 'COMPOSE').toUpperCase(),
        expression: s.expression || null,
        expectedPattern: s.expectedPattern || null,
        extractVar: s.extractVar || null,
        waitMillis: s.waitMillis ?? null,
      })),
    };
  }

  private mapDetail(detail: TemplateApi | null | undefined, operatorCode: string): UssdTemplate | null {
    if (!detail || typeof detail !== 'object') {
      return null;
    }
    const header = detail.template ?? detail;
    const id = header.id;
    if (id == null) {
      return null;
    }
    const rawSteps = Array.isArray(detail.steps) ? detail.steps : [];
    const steps: UssdStep[] = rawSteps.map((s, i) => ({
      id: s.id,
      stepOrder: s.stepOrder ?? i + 1,
      action: (s.action || 'COMPOSE').toUpperCase(),
      expression: s.expression ?? null,
      expectedPattern: s.expectedPattern ?? null,
      extractVar: s.extractVar ?? null,
      waitMillis: s.waitMillis ?? null,
    }));
    return {
      id,
      operatorId: header.operatorId,
      operatorCode,
      transactionType: header.transactionType,
      name: header.name ?? '',
      description: header.description,
      template: this.summarizeSteps(steps),
      active: header.active ?? true,
      steps,
    };
  }

  private unwrapList<T>(res: ApiResponse<T[]> | T[] | null | undefined): T[] {
    const data = this.unwrapData(res);
    return Array.isArray(data) ? data : [];
  }

  private unwrapData<T>(res: ApiResponse<T> | T | null | undefined): T | undefined {
    if (res == null) {
      return undefined;
    }
    if (typeof res === 'object' && 'data' in (res as object) && (res as ApiResponse<T>).data !== undefined) {
      return (res as ApiResponse<T>).data;
    }
    return res as T;
  }

  private requireData<T>(res: ApiResponse<T> | T | null | undefined, fallback: string): T {
    const data = this.unwrapData(res);
    if (data == null) {
      throw new Error(fallback);
    }
    return data;
  }

  private summarizeSteps(steps: UssdStep[]): string {
    return steps
      .map((s) => {
        const bits = [`${s.stepOrder ?? ''}. ${s.action}`];
        if (s.expression) bits.push(s.expression);
        if (s.expectedPattern) bits.push(`~${s.expectedPattern}`);
        return bits.filter(Boolean).join(' ');
      })
      .join('\n');
  }
}
