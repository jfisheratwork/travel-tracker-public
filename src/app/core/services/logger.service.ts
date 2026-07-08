/* eslint-disable no-console */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  info(message: string, ...optionalParams: any[]) {
    console.log(message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    console.warn(message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    console.error(message, ...optionalParams);
  }
}
