/**
 * 短信（Twilio）客户端：只在"紧急事件"时调用，收件人是管理员 + Case 负责人 + 接单销售。
 * 服务端 /api/sms 在配置了 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM 时真实发送，否则返回 mocked。
 */
export interface SmsResult { status: 'sent' | 'mocked' | 'failed'; detail: string }

export async function sendSms(phones: string[], body: string): Promise<SmsResult> {
  if (!phones.length) return { status: 'mocked', detail: '没有收件人' };
  try {
    const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: phones, body }) });
    if (!res.ok) return { status: 'failed', detail: `HTTP ${res.status}` };
    const data = (await res.json()) as SmsResult;
    return data;
  } catch (e) {
    return { status: 'failed', detail: e instanceof Error ? e.message : '网络错误' };
  }
}

export const smsBody = (pet: string, fileNo: string, title: string, detail: string) => `【JMAXPET 紧急】${pet} ${fileNo} ${title}：${detail}。请登录系统在「紧急变动」里确认。`;
