import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '../entities/usuario.entity';
import { ROLES_KEY } from './roles.decorator';
import { InsufficientPermissionsException } from '../common/exceptions/custom-exceptions';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        const hasRole = requiredRoles.some((role) => user.rol === role);

        if (!hasRole) {
            const requiredRoleStr = requiredRoles.join(' o ');
            throw new InsufficientPermissionsException(
                requiredRoleStr,
                this.getResourceAction(context),
            );
        }

        return true;
    }

    private getResourceAction(context: ExecutionContext): string {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const path = request.route?.path || request.url;

        const resourceMap: Record<string, string> = {
            '/api/v1/choferes': 'gestionar choferes',
            '/api/v1/tractores': 'gestionar tractores',
            '/api/v1/bateas': 'gestionar bateas',
            '/api/v1/viajes': 'gestionar viajes',
        };

        for (const [pattern, action] of Object.entries(resourceMap)) {
            if (path.includes(pattern)) {
                return action;
            }
        }

        return 'acceder a este recurso';
    }
}
