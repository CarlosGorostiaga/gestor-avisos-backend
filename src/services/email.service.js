import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL_PROD || 'https://nadir-agenda.vercel.app';

// Enviar email de verificación
async function sendVerificationEmail(email, token) {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verifica tu cuenta - Gestor de Avisos',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                      <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">Gestor de Avisos</h1>
                      <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Nadir</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">¡Bienvenido! 👋</h2>
                      <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Gracias por registrarte. Para activar tu cuenta y empezar a usar la aplicación, verifica tu email haciendo click en el botón de abajo:
                      </p>

                      <!-- Button -->
                      <table role="presentation" style="margin: 32px 0;">
                        <tr>
                          <td style="border-radius: 12px; background-color: #2563eb;">
                            <a href="${verifyUrl}" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                              Verificar mi cuenta
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Si no creaste esta cuenta, puedes ignorar este email.
                      </p>

                      <!-- Alternative link -->
                      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                          Si el botón no funciona, copia y pega este enlace en tu navegador:
                        </p>
                        <p style="margin: 0; color: #2563eb; font-size: 12px; word-break: break-all;">
                          ${verifyUrl}
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        © ${new Date().getFullYear()} Gestor de Avisos - Carlosgorostiaga.dev
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error enviando email de verificación:', error);
      return false;
    }

    console.log('✅ Email de verificación enviado:', data.id);
    return true;
  } catch (error) {
    console.error('Error en sendVerificationEmail:', error);
    return false;
  }
}

// Enviar email de recuperación de contraseña
async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Recupera tu contraseña - Gestor de Avisos',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                      <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">Gestor de Avisos</h1>
                      <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Nadir</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">Recupera tu contraseña 🔐</h2>
                      <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Recibimos una solicitud para restablecer tu contraseña. Haz click en el botón de abajo para crear una nueva:
                      </p>

                      <!-- Button -->
                      <table role="presentation" style="margin: 32px 0;">
                        <tr>
                          <td style="border-radius: 12px; background-color: #2563eb;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                              Restablecer contraseña
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este email.
                      </p>

                      <!-- Alternative link -->
                      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                          Si el botón no funciona, copia y pega este enlace en tu navegador:
                        </p>
                        <p style="margin: 0; color: #2563eb; font-size: 12px; word-break: break-all;">
                          ${resetUrl}
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        © ${new Date().getFullYear()} Gestor de Avisos - Carlosgorostiaga.dev
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error enviando email de recuperación:', error);
      return false;
    }

    console.log('✅ Email de recuperación enviado:', data.id);
    return true;
  } catch (error) {
    console.error('Error en sendPasswordResetEmail:', error);
    return false;
  }
}

export { sendVerificationEmail, sendPasswordResetEmail };