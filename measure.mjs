import { neon } from '@neondatabase/serverless'
import fs from 'fs'
const env=fs.readFileSync('.env.local','utf8')
const sql=neon(env.match(/^DATABASE_URL=(.*)$/m)[1].replace(/^["']|["']$/g,''))
// BASE override lets the same script measure any deployment (prod baseline
// vs local-after). Defaults to production.
const BASE=(process.env.MEASURE_BASE||'https://hitmanslibrary.xyz').replace(/\/+$/,'')
const rows=await sql.query('select id, source_url, screenshot_url from design_sources order by random() limit 20')
const AV={'Accept':'image/avif,image/webp,image/*,*/*;q=0.8'}
let raw=0, opt=0, n=0
for(const r of rows){
  try{
    const a=await fetch(r.screenshot_url,{method:'HEAD',signal:AbortSignal.timeout(20000)})
    const rawBytes=Number(a.headers.get('content-length')||0)
    const url=`${BASE}/_next/image?url=${encodeURIComponent(r.screenshot_url)}&w=1080&q=75`
    const b=await fetch(url,{headers:AV,signal:AbortSignal.timeout(60000)})
    const buf=await b.arrayBuffer()
    raw+=rawBytes; opt+=buf.byteLength; n++
    console.log(`${(rawBytes/1024).toFixed(0)}kb -> ${(buf.byteLength/1024).toFixed(0)}kb  ${b.headers.get('content-type')}  ${r.source_url.slice(0,45)}`)
  }catch(e){}
}
console.log(`\n${n} sites: ${(raw/1e6).toFixed(1)}MB -> ${(opt/1e6).toFixed(1)}MB  (${(100-opt/raw*100).toFixed(0)}% smaller, ${(raw/opt).toFixed(1)}x)`)
