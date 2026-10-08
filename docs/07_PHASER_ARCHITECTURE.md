# HTML5 + Phaser + TypeScript Architecture

เอกสารนี้กำหนดสถาปัตยกรรม ไม่ผูกกับ API หรือเวอร์ชันล่าสุด ก่อนเขียนซอร์สให้ตรวจเอกสารทางการของเวอร์ชันที่เลือกและ lock dependency

## Stack

Phaser สำหรับ scene, renderer, camera, input และ audio; TypeScript สำหรับระบบเกม; build tool ที่ bundle asset แบบ relative path ได้ เช่น Vite; static dist สำหรับ WebView; WebGL เป็นเป้าหมายหลัก Canvas fallback ต้องทดสอบแยกก่อนอ้างว่ารองรับทุกเอฟเฟกต์

## โครงสร้าง

```text
src/
  main.ts
  scenes/       Boot, Preload, Menu, HeroSelect, Battle, HUD, Results
  simulation/   GameState, Clock, Commands, Events
  systems/      Combat, Skills, Economy, Building, Navigation, AI
  entities/     Hero, Unit, Structure, Projectile
  input/        MobileInput, KeyboardInput
  ui/           Joystick, SkillButtons, BuildPanel, ShopPanel
  data/         heroes, items, buildings, stages, balance
  platform/     Lifecycle, SaveRepository, NativeBridge
  assets/
```

## แยก simulation จากภาพ

GameState เก็บตำแหน่ง HP cooldown inventory economy และ objective; Phaser objects เป็นภาพแทน state UI ส่ง command ไม่เปลี่ยน Gold/HP เอง ระบบตรวจเงื่อนไขก่อนยอมรับ command แล้วออก event ให้ UI และเอฟเฟกต์

ตัวอย่าง command: MoveIntent, CastSkill, PlaceBuilding, RepairBuilding, UpgradeBuilding, BuyItem, SetArmyOrder ระบบซื้อ/สร้างต้อง atomic และป้องกันคำสั่งซ้ำจาก double tap

## Fixed timestep

Simulation 30 ticks/วินาที; render ตามเครื่อง accumulator ใช้ real delta × timeScale จำกัด real delta 100 ms และ catch-up สูงสุด 5 ticks ต่อเฟรม เมื่อ background ให้ pause และ reset accumulator เมื่อกลับ ไม่จำลองเวลาที่หายไปทั้งหมด

ลำดับ tick: รับคำสั่ง → AI/เส้นทางตาม budget → เคลื่อนที่ → skills/projectiles → damage/death → เศรษฐกิจ/ก่อสร้าง → objective → events UI ทุก timer ใช้ clock เดียวกัน

หลีกเลี่ยง Phaser timer หรือ physics world ที่เดินด้วยเวลาแยกสำหรับกติกาที่ต้อง sync กับ simulation หากใช้ physics ให้กำหนดการอัปเดตให้สอดคล้องกับ tick

## ประสิทธิภาพ

- Pool minion, projectile, floating text, effect; reset state/listeners ทุกครั้งนำกลับใช้
- Spatial hash สำหรับหาระยะ ไม่ตรวจทุกคู่ยูนิต
- Navigation rebuild ตาม dirty version และ budget
- AI decision 2–5 ครั้ง/วินาที กระจายต่าง tick; movement ทุก tick
- Texture atlas และ preload ตามด่าน; ไม่โหลดทั้งหมดทุก scene
- จำกัด device pixel ratio ตาม quality setting; วัดบนเครื่องจริง
- ต้นแบบ cap 40 minions ต่อฝ่าย และ 30 ป้อมต่อฝ่าย; profile ก่อนเพิ่ม
- เป้าหมาย 60 FPS; โหมด 30 FPS ใช้ simulation 30 Hz เดิม

## Save

เก็บ schemaVersion, unlockedStages, unlockedHeroes, bestResults, settings ใน IndexedDB ผ่าน SaveRepository ห้ามเขียนทุกเฟรม บันทึกหลังผลด่านและเปลี่ยน setting พร้อมจัดการ error/ข้อมูลเสีย ใช้ default ปลอดภัยหากอ่านไม่ได้และแจ้งผู้เล่น

ต้นแบบไม่รองรับกลับเข้าแมตช์หลัง process ถูกฆ่า; resume เฉพาะเมื่อ process ยังอยู่และ game state ยังอยู่ บันทึกแมตช์เป็นงานเพิ่มในอนาคต

## ตรวจข้อมูลก่อนโหลด

ID ไม่ซ้ำ ค่า HP/range/cost ถูกขอบเขต recipe ไม่วน skill rank valid map spawn ใช้ได้ stage references ครบ asset paths มีจริง หากข้อมูลเสียให้แสดง error แทนเริ่มสนามที่เล่นต่อไม่ได้
