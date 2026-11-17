// lib/email/x-draft.ts
// The daily X post as an email to the owner: the text, the card, and one
// button that opens X with the post written. X's share link is free; the
// paid API is not needed. The link in the text pulls the site's card onto
// the post by itself (the /site/ page's og:image).
import type { Post } from '@/lib/x/compose'

export const intentUrl = (text: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function xDraftEmail(post: Post, card: string | null): { subject: string; html: string; text: string } {
  const href = intentUrl(post.text)
  const subject = `Today's post: ${post.text.split('\n')[0].slice(0, 70)}`
  const text = [post.text, '', `Post it: ${href}`].join('\n')
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f3f0;font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0d0d0c">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4e4e0;border-radius:12px;overflow:hidden">
<div style="padding:12px 16px;background:#f7f7f5;border-bottom:1px solid #e4e4e0;font-size:13px;color:#5c5c58">Today's post for @hitmanslibrary</div>
${card ? `<img src="${esc(card)}" width="520" alt="" style="display:block;width:100%;height:auto">` : ''}
<div style="padding:16px;white-space:pre-wrap">${esc(post.text)}</div>
<div style="padding:12px 16px;background:#f7f7f5;border-top:1px solid #e4e4e0">
<a href="${esc(href)}" style="display:inline-block;padding:10px 16px;background:#0d0d0c;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Post on X</a>
<span style="font-size:13px;color:#5c5c58;margin-left:8px">The card shows from the link.</span>
</div></div></body></html>`
  return { subject, html, text }
}

export async function sendXDraft(to: string, post: Post, card: string | null): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_PRO_FROM || "Hitman's Library <pro@hitmanslibrary.xyz>", to, ...xDraftEmail(post, card) }),
  }).catch(() => null)
  return Boolean(res?.ok)
}
