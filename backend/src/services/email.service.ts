import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = 'E-Prescription System <onboarding@resend.dev>'

async function send(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(`Email failed: ${error.message}`)
}

export async function sendActivationEmail(to: string, fullName: string, token: string) {
  const link = `${process.env.FRONTEND_URL}/activate/${token}`
  await send(to, 'Активация аккаунта — E-Prescription', `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1D9E75;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">E-Prescription System</h2>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:15px;color:#111">Здравствуйте, <b>${fullName}</b>!</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Администратор создал для вас аккаунт в системе E-Prescription.<br>
          Для завершения регистрации установите пароль по ссылке ниже.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block">
            Активировать аккаунт
          </a>
        </div>
        <p style="color:#6b7280;font-size:12px">Ссылка действительна 24 часа.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:4px">${link}</p>
      </div>
    </div>
  `)
}

export async function sendPasswordResetEmail(to: string, fullName: string, token: string) {
  const link = `${process.env.FRONTEND_URL}/reset-password/${token}`
  await send(to, 'Сброс пароля — E-Prescription', `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#2E5E9B;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">E-Prescription System</h2>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:15px;color:#111">Здравствуйте, <b>${fullName}</b>!</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">Нажмите кнопку ниже чтобы установить новый пароль.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#2E5E9B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block">
            Сбросить пароль
          </a>
        </div>
        <p style="color:#6b7280;font-size:12px">Ссылка действительна 1 час.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:4px">${link}</p>
      </div>
    </div>
  `)
}

export async function sendOtpEmail(to: string, fullName: string, otp: string, field: string) {
  const fieldRu = field === 'email' ? 'email адреса' : 'номера телефона'
  await send(to, 'Код подтверждения — E-Prescription', `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1D9E75;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">E-Prescription System</h2>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:15px;color:#111">Здравствуйте, <b>${fullName}</b>!</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">Вы запросили изменение ${fieldRu}. Введите код:</p>
        <div style="text-align:center;margin:32px 0">
          <div style="background:#f0fdf4;border:2px solid #1D9E75;border-radius:12px;display:inline-block;padding:20px 40px">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1D9E75">${otp}</span>
          </div>
        </div>
        <p style="color:#6b7280;font-size:12px;text-align:center">Код действителен 10 минут.</p>
      </div>
    </div>
  `)
}

export async function sendPrescriptionEmail(
  to: string,
  patientName: string,
  doctorName: string,
  prescriptionId: string,
  medications: { name: string; dosage: string; qtyPrescribed: number }[]
) {
  const link = `${process.env.FRONTEND_URL}/patient/${prescriptionId}`
  const medsHtml = medications.map(m =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111">${m.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:center">${m.dosage}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:center">${m.qtyPrescribed} шт.</td>
    </tr>`
  ).join('')

  await send(to, 'Электронный рецепт — E-Prescription', `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#1D9E75;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">E-Prescription System</h2>
        <p style="color:#d1fae5;margin:4px 0 0;font-size:13px">Электронный рецепт</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:15px;color:#111">Здравствуйте, <b>${patientName}</b>!</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Врач <b>${doctorName}</b> выписал вам электронный рецепт.<br>
          Предъявите QR-код в аптеке вместе с удостоверением личности.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;border:1px solid #e5e7eb">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Препарат</th>
              <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Дозировка</th>
              <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Количество</th>
            </tr>
          </thead>
          <tbody>${medsHtml}</tbody>
        </table>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#1D9E75;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block">
            Открыть рецепт и QR-код
          </a>
        </div>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px">
          <p style="margin:0;font-size:13px;color:#92400e">
            <b>Важно:</b> Рецепт действителен 30 дней. Предъявите QR-код и удостоверение личности.
          </p>
        </div>
      </div>
    </div>
  `)
}
