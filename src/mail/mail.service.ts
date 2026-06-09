import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Configuración del transporter de Nodemailer
    // Por defecto usa Gmail, pero se puede cambiar según las necesidades
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: process.env.MAIL_SECURE === 'true', // true para 465, false para otros puertos
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendPasswordRecoveryEmail(email: string, password: string): Promise<boolean> {
    try {
      // NOTA DE SEGURIDAD: Enviar contraseñas por email no es seguro
      // En producción, usar tokens de reset temporales
      const mailOptions = {
        from: process.env.MAIL_FROM || '"Sistema de Transporte" <noreply@transporte.com>',
        to: email,
        subject: 'Recuperación de Contraseña - Sistema de Transporte',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Recuperación de Contraseña</h2>
            <p>Hola,</p>
            <p>Has solicitado recuperar tu contraseña. A continuación te proporcionamos tu información de acceso:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Contraseña:</strong> ${password}</p>
            </div>
            <p>Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Si no solicitaste este correo, puedes ignorarlo de forma segura.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 11px;">
              Este es un correo automático, por favor no responder.
            </p>
          </div>
        `,
        text: `
Recuperación de Contraseña

Has solicitado recuperar tu contraseña. A continuación te proporcionamos tu información de acceso:

Email: ${email}
Contraseña: ${password}

Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión.

Si no solicitaste este correo, puedes ignorarlo de forma segura.
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de recuperación enviado a: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar email de recuperación a ${email}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, nombre: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.MAIL_FROM || '"Sistema de Transporte" <noreply@transporte.com>',
        to: email,
        subject: 'Bienvenido al Sistema de Transporte',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">¡Bienvenido ${nombre}!</h2>
            <p>Tu cuenta ha sido creada exitosamente en el Sistema de Transporte.</p>
            <p>Ahora puedes iniciar sesión con tu email y contraseña.</p>
            <p>Tu estado actual es <strong>Inactivo</strong> y está pendiente de asignación por parte del administrador.</p>
            <p style="margin-top: 30px;">¡Gracias por unirte a nuestro equipo!</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 11px;">
              Este es un correo automático, por favor no responder.
            </p>
          </div>
        `,
        text: `
¡Bienvenido ${nombre}!

Tu cuenta ha sido creada exitosamente en el Sistema de Transporte.

Ahora puedes iniciar sesión con tu email y contraseña.

Tu estado actual es Inactivo y está pendiente de asignación por parte del administrador.

¡Gracias por unirte a nuestro equipo!
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de bienvenida enviado a: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar email de bienvenida a ${email}:`, error);
      return false;
    }
  }

  async sendTripRejectedEmail(adminEmail: string, choferNombre: string, viajeInfo: any): Promise<boolean> {
    try {
      const { origen, destino, toneladas_cargadas } = viajeInfo;
      const mailOptions = {
        from: process.env.MAIL_FROM || '"Sistema de Transporte" <noreply@transporte.com>',
        to: adminEmail,
        subject: `⚠️ Viaje Rechazado por Chofer - ${choferNombre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d9534f; margin-top: 0;">⚠️ Notificación de Viaje Rechazado</h2>
            <p>El chofer <strong>${choferNombre}</strong> ha rechazado el viaje asignado.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d9534f;">
              <p style="margin: 5px 0;"><strong>Origen:</strong> ${origen}</p>
              <p style="margin: 5px 0;"><strong>Destino:</strong> ${destino}</p>
              <p style="margin: 5px 0;"><strong>Toneladas:</strong> ${toneladas_cargadas}t</p>
            </div>
            <p>El viaje ha sido eliminado del sistema y los recursos (chofer, tractor y batea) han sido liberados y están disponibles para nuevas asignaciones.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 11px;">Este es un correo automático del Sistema de Transporte.</p>
          </div>
        `,
        text: `
⚠️ Notificación de Viaje Rechazado

El chofer ${choferNombre} ha rechazado el viaje asignado.

Detalles del Viaje:
- Origen: ${origen}
- Destino: ${destino}
- Toneladas: ${toneladas_cargadas}t

El viaje ha sido eliminado del sistema y los recursos (chofer, tractor y batea) han sido liberados.
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de viaje rechazado enviado a: ${adminEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar email de viaje rechazado a ${adminEmail}:`, error);
      return false;
    }
  }
}

