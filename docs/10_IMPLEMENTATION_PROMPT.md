# พรอมต์ส่งต่อสำหรับพัฒนา

คัดลอกข้อความด้านล่างพร้อมแนบเอกสารทั้งหมดในแพ็กเกจ

---

สร้างเกม Kingdom Clash ด้วย HTML5 + Phaser + TypeScript ตามเอกสารที่แนบ สำหรับมือถือแนวนอน และเตรียม static build เพื่อครอบเป็น Android APK ผ่าน WebView ภายหลัง

อ่าน README และเอกสาร 01–09 ก่อนแก้โค้ด ใช้ Hybrid MOBA + RTS และ Top-down เป็นค่าเริ่มต้น ห้ามนำระบบ Zombie Base Defense หรือเกมอื่นมาปน เป้าหมายคือเกมเล่นได้จริง ไม่ใช่ landing page หรือภาพจำลองเกม

ตรวจ workspace และคำแนะนำโครงการก่อนเริ่ม ถ้ามีโปรเจกต์อยู่ให้รักษาโครงสร้างที่เหมาะสม ตรวจเอกสารทางการของ Phaser/build tool เวอร์ชันที่เลือกก่อนใช้ API แล้ว pin dependency/lockfile ไม่ต้องสร้าง Multiplayer, backend หรือบัญชีผู้ใช้

พัฒนา Phase 1 ให้เล่นจบได้ก่อน แล้วต่อ Phase 2–4 ตามลำดับ ไม่อ้างว่าครบ 30 ด่านหากยังมีเพียงต้นแบบ ต้องมี Hero 3 ตัว ด่าน 1–6 Free Play 1v1 LV1–20 skill points ตายเกิดใหม่ Grid building dynamic navigation เหมือง Barracks และ Artifact 6 ช่องพร้อม Fusion

แยก simulation จาก rendering ใช้ fixed tick 30 Hz ระบบเกมทุก timer ใช้ simulation clock เดียวกัน Implement pause/slow motion จาก state ห้าม timeScale ทบกัน UI ส่ง commands ผ่าน validation และ atomic transaction ทุกการซื้อ/รวม/สร้าง

รองรับ multitouch joystick + skills, pointer cancel, safe area, portrait pause, menu/back contract และ lifecycle pause/resume เกมเปิดใน browser ได้โดยไม่มี native bridge

รวม runtime และ asset ภายใน build ไม่ใช้ CDN ขณะเล่น ไม่ดาวน์โหลด art ที่ไม่มีสิทธิ์ ใช้ placeholder ที่ระบุชัดในระยะแรก หลีกเลี่ยงเพิ่มเอฟเฟกต์ที่ทำให้มือถือช้าก่อนมีผล profile

สร้าง README วิธี install/run/build และเอกสาร Android integration ระบุอย่างตรงไปตรงมาว่ายังไม่ได้สร้าง APK หากมีเฉพาะเว็บ source ตรวจ build และการเล่นจริง รวมกรณี double tap, full inventory fusion, blocked route, pause timers, restart save และสัมผัสหลายจุด

ส่งมอบ source, lockfile, static dist ที่เปิดออฟไลน์ผ่าน wrapper ได้, รายการระบบที่ทำจริง, ผลทดสอบ และข้อจำกัดที่ยังเหลือ ห้ามรายงานว่าได้ทดสอบบน Android จริงหากทดสอบเฉพาะ desktop browser

---
