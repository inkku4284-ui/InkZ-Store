# วิธีตรวจ Security ของ InkZ โดยไม่ใช้เงินจริง

คู่มือนี้ใช้กับ Sandbox Preview เท่านั้น ส่วน https://inkz-store.vercel.app เป็นร้านจริง
ที่รับเงินจริง และยังใช้ระบบส่งไฟล์เดิมจนกว่าจะอนุมัติ cutover ตาม
[คู่มือ Production](./PRODUCTION_SECURITY_HANDOFF.md)

## ก่อนเริ่ม

- เปิด URL ของ Preview ที่ตั้งค่าระบบ secure delivery แล้ว ไม่ใช่ URL Production
- ตรวจว่าปุ่มซื้อแสดง TEST MODE และ Stripe Checkout เป็นรายการทดสอบ
- ใช้อีเมลเจ้าของบัญชี Resend สำหรับชุดทดสอบปัจจุบัน
- ห้ามส่ง API key, cookie, ลิงก์ยืนยันอีเมล หรือ URL ดาวน์โหลดส่วนตัวใน issue/screenshot
- Vercel Authentication กับสิทธิ์ซื้อสินค้าเป็นคนละชั้น:
  เบราว์เซอร์ทดสอบต้องผ่าน deployment protection ก่อนจึงจะตรวจระบบของร้านได้
  หน้า login ของ Vercel ไม่ได้พิสูจน์ว่า InkZ ป้องกันลิงก์ซื้อสำเร็จ

## ชุดทดสอบด้วยตัวเอง

| ทำอะไร | ผลที่ควรได้บน secure Preview |
| --- | --- |
| ซื้อ Sandbox โดยยังไม่ Authorize PromptPay | ยังดาวน์โหลดไม่ได้ |
| กด Authorize Test Payment แล้วกลับมาในเบราว์เซอร์เดิม | ดาวน์โหลดได้เมื่อระบบตรวจว่าจ่ายสำเร็จแล้ว |
| คัดลอก URL หน้า order ไปอีกเบราว์เซอร์ที่ไม่มี cookie ของร้าน | ไม่มีสิทธิ์ดาวน์โหลดจาก URL อย่างเดียว ต้องกู้สิทธิ์ |
| ขออีเมลกู้สิทธิ์จากเบราว์เซอร์ใหม่ แล้วเปิดอีเมลในเบราว์เซอร์นั้น | กดยืนยันเบราว์เซอร์แล้วจึงดาวน์โหลดได้ |
| เปิดลิงก์อีเมลอย่างเดียว ยังไม่กด Confirm | ยังไม่ใช้สิทธิ์ยืนยันจนกว่าจะส่ง POST |
| ใช้ลิงก์อีเมลเดิมหลังยืนยันไปแล้ว | ไม่สามารถยืนยันซ้ำ |
| กดดาวน์โหลดใหม่หลัง ticket ก่อนหน้าหมดอายุ/ถูกใช้ | ออก ticket ใหม่ได้เมื่อสิทธิ์ซื้อยังใช้งานได้ |
| คืนเงินเต็มจำนวนใน Sandbox แล้วลองขอดาวน์โหลดใหม่ | ถูกปฏิเสธเมื่อระบบตรวจสถานะล่าสุด |

การคืนเงินเป็นการแก้ข้อมูล Stripe: ใช้เฉพาะรายการ Sandbox ที่ได้รับอนุญาต
อย่าทำกับ Live เพื่อทดลอง คู่มือนี้ไม่ได้อนุญาตให้คืนเงินลูกค้าจริง

ลิงก์หน้า order กับ ticket ดาวน์โหลดเป็นคนละอย่าง:
ticket ใช้ได้ครั้งเดียวและผูกกับเบราว์เซอร์ แต่ผู้ซื้อที่ยังมีสิทธิ์สามารถ
ขอ ticket ใหม่ได้ ไม่ได้จำกัดให้ซื้อแล้วดาวน์โหลดได้เพียงครั้งเดียวตลอดไป

การเปิด URL ในอีกแท็บของเบราว์เซอร์เดิมมักยังใช้ cookie เดิม
จึงไม่ใช่การทดสอบคนละเครื่อง ใช้อีก browser profile หรืออีก browser จริง
และผ่าน Vercel protection ให้เรียบร้อยก่อน

## รันเทสอัตโนมัติบน Windows

เปิด PowerShell ใน D:\Codex\Projects\InkZ-Store ใช้ npm.cmd เพื่อไม่ชนข้อจำกัด npm.ps1

```powershell
npm.cmd ci
npm.cmd run test:server
npm.cmd audit --audit-level=moderate
npm.cmd run build
npm.cmd run test:e2e -- tests/checkout-navigation.spec.ts tests/store.spec.ts
```

ก่อน build/รัน browser tests ให้ใช้ test shell ที่ไม่มี Live secrets หรือ cloud
database credentials ใน environment หรือไฟล์ .env ที่ Next โหลด และตรวจว่า
store configuration ปิดอยู่ ชุด browser tests นี้คาดหวังร้านปิดตามค่าเริ่มต้น
หยุด dev server ที่ port 3000 ก่อน เพราะ Playwright เปิด production server ของตัวเอง
คำว่า production server ในที่นี้หมายถึง build ที่รันบนเครื่อง ไม่ใช่ deploy ร้านจริง

- Server tests ใช้ Stripe fixtures และ PGlite; ไม่ใช่การจ่ายเงินจริง
- ชุด pooled PostgreSQL ข้ามบนเครื่องถ้าไม่มี disposable localhost database;
  CI มีฐานข้อมูลสำหรับชุดนี้ ห้ามใช้ฐานข้อมูลลูกค้าจริงกับ integration tests
- Browser tests ใช้ desktop/mobile และจำลองผลตอบกลับ Checkout สำหรับ navigation
- ผลเขียวไม่ได้ยืนยันว่า live configuration, การส่งเข้า inbox และ flow บน hosted
  Preview ถูกต้องทั้งหมด จึงยังต้องทำ manual scenarios ด้านบน

## ขอบเขตที่ต้องเข้าใจ

Security ชุดนี้ควบคุมสิทธิ์รับไฟล์ ไม่ใช่ DRM หลังผู้ซื้อดาวน์โหลดสำเร็จ
ไม่สามารถห้ามเขาคัดลอกไฟล์ต่อหรือดึงไฟล์ที่ส่งไปแล้วกลับคืนได้
ผล audit เป็นการค้นหาช่องโหว่ที่เครื่องมือรู้จัก ไม่ใช่คำรับรองว่าไม่มีช่องโหว่ทุกชนิด

## ผลตรวจซ้ำวันที่ 24 ตุลาคม 2026

ตรวจบน branch ที่ต่อจาก main `91f1ec5`; การแก้ไขใน PR #13 เป็นเอกสารเท่านั้น

| รายการ | ผล |
| --- | --- |
| Server tests จากรอบก่อนหน้าใน session นี้ | ผ่าน 49, ล้ม 0, ข้าม pooled PostgreSQL 1 |
| Browser checkout navigation + store บน desktop/mobile | ผ่านครบ 32 |
| npm audit รวม development dependencies | พบ 0 vulnerabilities |
| ค้นหาค่าลับที่รู้จัก 11 ค่าในไฟล์ข้อความ Git 148 ไฟล์ และ history 406 blobs | ไม่พบ |
| ค้นหาใน public/client build assets ที่อยู่บนเครื่อง 20 ไฟล์ | ไม่พบ |
| private .env ที่ Git ติดตาม | ไม่มี |

การสแกน secrets ข้าม binary/ไฟล์ขนาดใหญ่ 160 blobs และรอบนี้ไม่ได้สแกน
เนื้อหาบนบริการภายนอกทุกแห่ง ผลนี้จึงยืนยันเฉพาะขอบเขตที่ระบุ
Browser suite ใช้ local production build ที่มีอยู่ก่อนแล้วและ API fixtures
ไม่ได้ส่งอีเมล จ่ายเงินจริง หรือยืนยัน hosted live cutover
