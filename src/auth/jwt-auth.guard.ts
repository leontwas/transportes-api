import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  NoTokenProvidedException,
  InvalidTokenException,
} from '../common/exceptions/custom-exceptions';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new NoTokenProvidedException();
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new InvalidTokenException();
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new InvalidTokenException();
      }

      if (info?.name === 'NotBeforeError') {
        throw new InvalidTokenException();
      }

      throw new NoTokenProvidedException();
    }

    return user;
  }
}
