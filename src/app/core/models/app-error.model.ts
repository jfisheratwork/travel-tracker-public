export enum AppErrorType {
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export const AppErrorMessages: Record<AppErrorType, string> = {
  [AppErrorType.NETWORK_TIMEOUT]: 'The network request timed out. Please check your connection and try again.',
  [AppErrorType.UNAUTHORIZED]: 'You do not have permission to access this resource.',
  [AppErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [AppErrorType.SERVER_ERROR]: 'The server encountered an error. Please try again later.',
  [AppErrorType.VALIDATION_ERROR]: 'Invalid data provided to the server.',
  [AppErrorType.UNKNOWN]: 'An unexpected network error occurred.',
};

export interface AppError {
  type: AppErrorType;
  message: string;
  originalError?: unknown;
}
