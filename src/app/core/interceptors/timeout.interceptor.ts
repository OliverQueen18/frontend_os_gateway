import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';

/** Évite les attentes longues quand le backend est saturé / injoignable. */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const ms = req.url.includes('/auth/login') ? 20000 : 12000;
  return next(req).pipe(
    timeout({ first: ms }),
    catchError((err) => {
      if (err instanceof TimeoutError) {
        return throwError(() => ({
          status: 0,
          message: 'Délai dépassé — le serveur met trop de temps à répondre',
          error: { message: 'Délai dépassé — le serveur met trop de temps à répondre' },
        }));
      }
      return throwError(() => err);
    }),
  );
};
