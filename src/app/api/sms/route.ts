import { NextResponse } from 'next/server';

/**
 * POST /api/sms  { to: string[], body: string }
 * 配置了 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM 时通过 Twilio REST API 真实发送；
 * 否则返回 mocked（demo 模拟发送，不产生费用）。
 */
export async function POST(req: Request) {
  const { to, body } = (await req.json()) as { to: string[]; body: string };
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    return NextResponse.json({ status: 'mocked', detail: `Twilio 未配置，demo 模拟发送 ${to.length} 条` });
  }
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const results = await Promise.all(
    to.map(async (phone) => {
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: phone.replace(/[\s-]/g, ''), From: from, Body: body }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }),
  );
  const ok = results.filter(Boolean).length;
  return NextResponse.json({ status: ok === 0 ? 'failed' : 'sent', detail: `${ok}/${to.length} 条发送成功` });
}
