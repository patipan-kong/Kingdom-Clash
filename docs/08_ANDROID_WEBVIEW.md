# Android WebView และ APK

## หลักการ

ส่งออก static dist ที่มีไฟล์เกมและ asset ครบ ไม่พึ่ง CDN หรืออินเทอร์เน็ตขณะเล่น แพ็ก dist ลง Android assets ใช้ asset-serving origin ภายในแอป เช่น WebViewAssetLoader ตามเอกสารทางการของ Android เวอร์ชันที่นำไปใช้ หลีกเลี่ยงเปิดสิทธิ์ universal file access เพื่อแก้ปัญหาโหลด asset

เอกสารนี้ไม่ใช่โปรเจกต์ Android และยังไม่มี APK ต้องตรวจ API และข้อกำหนด Android ปัจจุบันก่อนสร้าง wrapper จริง

## Android wrapper

- กำหนดแนวนอนใน wrapper; หน้าเว็บมี portrait fallback
- เปิด JavaScript และ storage ที่เกมใช้
- เลือก rendering/hardware acceleration ที่เหมาะสมและทดสอบเครื่องจริง
- จัดการ safe-area/system bars ไม่ให้ปุ่มทับพื้นที่ gesture
- Back ส่งเข้าเกม: ปิด panel → pause menu → ยืนยันออก
- onPause ส่ง pause ให้เกมและหยุดเสียง; onResume ส่งสถานะกลับ แต่ให้ผู้เล่นกดเล่นต่อ
- ไม่เปิดลิงก์ภายนอกใน game WebView โดยอัตโนมัติ

## Native bridge

สร้าง adapter ฝั่งเว็บเพื่อให้เปิดใน browser ได้เมื่อไม่มี Android bridge อนุญาตข้อความเฉพาะประเภท เช่น pause, resume, back, requestExit ตรวจ type และ payload ใช้เฉพาะ trusted local origin ไม่ expose method เรียกไฟล์/คำสั่งระบบทั่วไป

ชื่อ event เป็นข้อตกลงโครงการ ไม่ใช่ API Android สำเร็จรูป: `platform:pause`, `platform:resume`, `platform:back` เกมตอบ `game:ready` และ `game:requestExit` wrapper ต้อง implement การรับส่งจริง

## Asset และ save

relative asset URLs ต้องทำงานจาก origin ของ wrapper ทดสอบ preload, audio และ JSON ใน airplane mode ไม่เปิด Service Worker โดยไม่จำเป็นใน APK เพราะ asset อยู่ใน package แล้ว

ความคืบหน้าอยู่ใน storage ของแอป ต้องทดสอบว่าคงอยู่หลังปิดและอัปเดต APK โดยใช้ application ID และ origin เดิม การล้างข้อมูล/ถอนติดตั้งอาจลบ save ไม่มี cloud backup ในขอบเขตปัจจุบัน

## ทดสอบก่อนแจก APK

เดินพร้อมใช้สกิลได้ เสียงเริ่มหลังแตะ เปิดร้านและสร้างไม่เลื่อนหน้า Home/lock screen หยุดเวลา Back ทำงานตามลำดับ เปลี่ยนขนาดหน้าจอไม่ทำให้ HUD หาย เปิดออฟไลน์ได้ บันทึกไม่หายหลัง restart เล่นต่อเนื่อง 15 นาทีไม่ร้อน/หน่วงจนควบคุมไม่ได้
