/* eslint-disable no-console */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  info(message: string, ...optionalParams: unknown[]) {
    console.log(message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: unknown[]) {
    console.warn(message, ...optionalParams);
  }

  error(message: string, ...optionalParams: unknown[]) {
    console.error(message, ...optionalParams);
  }
}
