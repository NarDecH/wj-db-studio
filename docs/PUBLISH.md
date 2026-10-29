# เผยแพร่ WJ DB Studio สู่ GitHub (ทีละขั้น)

> หลังทำครั้งนี้ ทุกครั้งที่ปล่อยเวอร์ชันใหม่แค่: bump version → commit → tag → push

## ครั้งแรก (เตรียมระบบ)

1. **สร้าง repository บน GitHub** (เว็บ): New repository → ชื่อ เช่น `wj-db-studio` → Public → ไม่ต้องใส่ README (เรามีแล้ว)

2. **แก้ชื่อ repo ของคุณใน 3 จุด** (แทน `NarDecH/wj-db-studio`):
   - `package.json` → `"homepage"`, `"repository.url"`, `"build.publish.owner"`, `"build.publish.repo"`
   - `src/settings.js` → ลิงก์ GitHub Releases ในหน้า About
   - `README.md` / `README.th.md` → ลิงก์ Releases

3. **Push ครั้งแรก:**
   ```bash
   git remote add origin https://github.com/NarDecH/wj-db-studio.git
   git push -u origin main
   ```

4. **ปล่อยเวอร์ชันแรก (สร้าง release อัตโนมัติ):**
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
   → GitHub Actions (`.github/workflows/release.yml`) จะ build
   **Windows installer + Portable / Linux AppImage / macOS dmg** และ
   แนบลงหน้า Releases ให้เอง (ใช้ GITHUB_TOKEN ในตัว ไม่ต้องตั้ง secret)

5. ตรวจที่ **Actions** tab (รอ ~5-10 นาที) → แล้วดูที่ **Releases**

## เวอร์ชันถัดไป (หลังแก้โค้ด/เพิ่มฟีเจอร์)

```bash
# 1) bump version
npm version patch   # หรือ minor ถ้าเพิ่มฟีเจอร์ใหญ่
# 2) อัปเดต CHANGELOG.md สั้น ๆ
git add -A && git commit -m "..." && git push
# 3) ปล่อย
git tag v1.1.1 && git push origin v1.1.1
```

ผู้ใช้ที่เปิดแอปอยู่จะได้รับแจ้งอัปเดตอัตโนมัติ (electron-updater อ่านจาก Releases)

## เกร็ด

- ต้องการ **ลายเซ็นดิจิทัล** กัน SmartScreen เตือน: ซื้อ Code Signing Certificate
  แล้วตั้ง `CSC_LINK` / `CSC_KEY_PASSWORD` เป็น GitHub secrets (ไม่บังคับ)
- Portable exe เหมาะแจกแบบไม่ต้องติดตั้ง; NSIS เหมาะผู้ใช้ทั่วไป
- หากต้องการให้ user ทั่วไปดาวน์โหลดง่าย: ไป Releases → แก้ release notes เป็นภาษาไทย + ภาพ
