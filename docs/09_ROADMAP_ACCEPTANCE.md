# Roadmap และเกณฑ์ตรวจรับ

## Phase 1 — Vertical slice

หนึ่ง Hero หนึ่งสนาม หนึ่งคลื่น ฐานทั้งสองฝั่ง Joystick โจมตี ตายเกิดใหม่ Wall Archer Tower ทรัพยากรพื้นฐาน dynamic path และผลชนะ/แพ้ ใช้ asset ชั่วคราวที่บอกชัดว่าเป็น placeholder ได้

ผ่านเมื่อสร้างกำแพงเปลี่ยนเส้นทางจริง ศัตรูทำลายได้ เงินไม่ติดลบ และเดินพร้อมยิงบนมือถือได้

## Phase 2 — Hero / Artifact

เพิ่ม Hero เป็น 3 ตัว LV1–20 สกิลและแต้ม ร้านค้า 6 ช่อง ซื้อขายและ Fusion การซ่อมอาคาร ใช้ค่าจาก data

ผ่านเมื่อแต้มรวม 20 ไม่เกิน rank limit และสูตรรวมไม่หักเงินซ้ำ/สร้างช่องเกิน

## Phase 3 — Campaign 1–6

เพิ่ม tutorial, หลายทิศ, เหมือง, upgrades, boss, Barracks และคำสั่งกองทัพ บันทึกปลดล็อกด่าน

ผ่านเมื่อเล่นต่อครบ 6 ด่านได้โดยไม่ใช้ developer tools และไม่ soft lock เมื่อเสียเหมือง

## Phase 4 — Free Play / WebView

เพิ่ม Enemy Hero AI และ Free Play 1v1, Easy/Normal, quality setting, offline dist, lifecycle/back bridge contract และเอกสารแพ็ก APK

ผ่านเมื่อแข่งจนจบได้ทั้งชนะ/แพ้ เปิด airplane mode ได้ และ pause ไม่ให้เศรษฐกิจ/respawn/cooldown เดิน

## Phase 5 — ขยาย

5 Heroes, ด่าน 7–30, Hard AI, enemy construction, Free Play 3v3/5v5 ต้อง profile และปรับระบบงบสร้างก่อนเพิ่มจำนวนยูนิต

## Checklist สำคัญ

| กรณี | ผลที่ต้องได้ |
|---|---|
| Double tap ซื้อ/สร้าง | ใช้ transaction ถูกต้อง ไม่เกินทรัพยากร |
| Inventory เต็มแต่มีส่วนประกอบ | Fusion สำเร็จถ้าช่องหลังรวมเพียงพอ |
| ส่วนประกอบ/Gold ไม่พอ | ไม่เปลี่ยน state |
| วางทับ Hero/จุดเกิด | ปฏิเสธพร้อมเหตุผล |
| ปิดเส้นทางทั้งหมดด้วยกำแพง | ศัตรูโจมตีกำแพงได้ |
| กำแพงพังขณะยูนิตเดิน | เส้นทางอัปเดต ไม่เดินทะลุอาคาร |
| เปิด Build แล้ว Shop | timeScale ไม่ทบ และคืนค่าถูกต้อง |
| ปล่อยนิ้วหลังแอป background | ไม่มี joystick ค้าง |
| Hero LV20 | XP ไม่เพิ่มเลเวล 21 |
| รีสตาร์ตแอป | ความคืบหน้าด่านคงอยู่ |
| Process ถูกฆ่าระหว่างเล่น | กลับเมนู ไม่อ้างว่ากู้แมตช์ได้ |

ทดสอบความถูกต้องด้วย unit tests เฉพาะระบบคำนวณ/ธุรกรรมสำคัญ และ manual gameplay บน Android WebView สำหรับสัมผัส เสียง safe area และประสิทธิภาพ ไม่มีผลทดสอบแนบในแพ็กเกจเอกสารนี้
