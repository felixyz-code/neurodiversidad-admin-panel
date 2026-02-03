import { HttpParams } from '@angular/common/http';

type ParamValue = string | number | boolean | null | undefined;
type ParamInput = Record<string, ParamValue | ParamValue[]>;

export const buildHttpParams = (params: ParamInput): HttpParams => {
  let httpParams = new HttpParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === null || item === undefined || item === '') {
          return;
        }
        httpParams = httpParams.append(key, String(item));
      });
      return;
    }
    httpParams = httpParams.set(key, String(value));
  });

  return httpParams;
};
