import {
  UnauthorizedException as NestUnauthorizedException,
  ForbiddenException as NestForbiddenException,
  NotFoundException as NestNotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: string;
  requiredRole?: string;
  action?: string;
}

export class UnauthorizedException extends NestUnauthorizedException {
  constructor(message: string, action?: string, details?: string) {
    const response: ErrorResponse = {
      error: 'Unauthorized',
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
      action,
      details,
    };
    super(response);
  }
}

export class ForbiddenException extends NestForbiddenException {
  constructor(
    message: string,
    requiredRole?: string,
    details?: string,
  ) {
    const response: ErrorResponse = {
      error: 'Forbidden',
      message,
      statusCode: HttpStatus.FORBIDDEN,
      requiredRole,
      details,
    };
    super(response);
  }
}

export class NotFoundException extends NestNotFoundException {
  constructor(message: string, details?: string) {
    const response: ErrorResponse = {
      error: 'NotFound',
      message,
      statusCode: HttpStatus.NOT_FOUND,
      details,
    };
    super(response);
  }
}

// Excepciones específicas de autenticación
export class NoTokenProvidedException extends UnauthorizedException {
  constructor() {
    super(
      'No se proporcionó token de autenticación',
      'Inicia sesión para continuar',
    );
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super(
      'Token de autenticación inválido o expirado',
      'Vuelve a iniciar sesión',
      'El token proporcionado no es válido o ha expirado',
    );
  }
}

export class InactiveUserException extends UnauthorizedException {
  constructor() {
    super(
      'Tu cuenta está inactiva',
      'Contacta al administrador',
      'El usuario existe pero su cuenta está desactivada',
    );
  }
}

// Excepciones específicas de autorización
export class InsufficientPermissionsException extends ForbiddenException {
  constructor(requiredRole: string, resource?: string) {
    super(
      'No tienes permisos para acceder a este recurso',
      requiredRole,
      resource
        ? `Solo los ${requiredRole}s pueden ${resource}`
        : `Se requiere rol de ${requiredRole}`,
    );
  }
}

export class ResourceAccessDeniedException extends ForbiddenException {
  constructor(resourceType: string) {
    super(
      `Solo puedes acceder a tu propi${resourceType === 'chofer' ? 'o' : 'a'} ${resourceType}`,
      undefined,
      `No puedes ver la información de otros ${resourceType}s`,
    );
  }
}
