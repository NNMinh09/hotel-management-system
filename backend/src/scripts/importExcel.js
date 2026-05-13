/**
 * Script import dữ liệu từ file Excel vào MongoDB
 * Chạy: node src/scripts/importExcel.js <đường dẫn file Excel>
 * Ví dụ: node src/scripts/importExcel.js "./data/hotel.xlsx"
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== MODELS =====
import Location from "../models/Location.js";
import Asset from "../models/Asset.js";
import PreventivePlan from "../models/PreventivePlan.js";
import User from "../models/User.js";

// ===== CONFIG =====
const EXCEL_FILE = process.argv[2] || path.join(__dirname, "../../data/hotel.xlsx");

// Map danh mục Excel → category trong DB
const CATEGORY_MAP = {
  "tủ điện": "electrical",
  "thiết bị điện": "electrical",
  "thiết bị điện khác": "electrical",
  "thiết bị kỹ thuật khác": "other",
  "thang máy": "elevator",
  "điều hòa": "hvac",
  "hvac": "hvac",
  "máy bơm": "plumbing",
  "hệ thống nước": "plumbing",
  "thiết bị bếp": "appliance",
  "âm thanh": "other",
  "ánh sáng": "electrical",
  "pccc": "other",
  "camera": "other",
  "default": "other"
};

// Map chu kỳ bảo trì → số ngày
const INTERVAL_MAP = {
  "1 tháng": 30,
  "1 tháng/1 lần": 30,
  "1 tháng/ 1 lần": 30,
  "2 tháng": 60,
  "2 tháng/1 lần": 60,
  "3 tháng": 90,
  "3 tháng/1 lần": 90,
  "3 tháng/ 1 lần": 90,
  "4 tháng": 120,
  "4 tháng/1 lần": 120,
  "4 tháng / 1 lần": 120,
  "6 tháng": 180,
  "6 tháng/1 lần": 180,
  "1 năm": 365,
  "12 tháng": 365,
};

// Map tầng từ tên sheet
const FLOOR_MAP = {
  "TẦNG B": -1,
  "TẦNG G": 0,
  "TẦNG 2": 2,
  "TẦNG 3": 3,
  "TẦNG 4": 4,
  "TẦNG 5": 5,
  "TẦNG 6": 6,
  "TẦNG 7": 7,
  "TẦNG 8": 8,
  "TẦNG 9": 9,
  "TẦNG 10": 10,
  "TẦNG 11": 11,
  "TẦNG 12": 12,
  "TẦNG MÁI": 13,
};

// ===== HELPERS =====
function getCategory(danhmuc) {
  if (!danhmuc) return "other";
  const lower = danhmuc.toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "other";
}

function getIntervalDays(kehoach) {
  if (!kehoach) return 90;
  const lower = kehoach.toLowerCase().trim();
  for (const [key, val] of Object.entries(INTERVAL_MAP)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return 90;
}

function isDataRow(row) {
  const stt = row[0];
  return typeof stt === "number" && Number.isInteger(stt) && stt > 0;
}

function isGroupHeader(row) {
  const stt = row[0];
  return typeof stt === "string" && stt.match(/^\d+\.\s+/);
}

// ===== MAIN =====
async function main() {
  console.log("🔌 Kết nối MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  // Lấy admin user để gán createdBy
  const adminUser = await User.findOne({ role: "admin" });
  if (!adminUser) {
    console.error("❌ Không tìm thấy Admin user. Hãy tạo admin trước!");
    process.exit(1);
  }
  console.log(`👤 Admin: ${adminUser.name}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE);
  console.log(`📂 Đọc file: ${EXCEL_FILE}`);
  console.log(`📋 Sheets: ${workbook.worksheets.map(w => w.name).join(", ")}\n`);

  let totalLocations = 0;
  let totalAssets = 0;
  let totalPlans = 0;
  let skipped = 0;

  // Cache locations để tránh query DB nhiều lần
  const locationCache = {};

  // Helper: Upsert location
  async function upsertLocation(locationName, floor, sheetName) {
    if (!locationName || !locationName.trim()) return null;
    const name = locationName.trim();
    const cacheKey = name.toLowerCase();

    if (locationCache[cacheKey]) return locationCache[cacheKey];

    let location = await Location.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });

    if (!location) {
      // Tự đoán loại vị trí
      const nameLower = name.toLowerCase();
      let type = "other";
      if (nameLower.includes("phòng")) type = "room";
      else if (nameLower.includes("sảnh") || nameLower.includes("lobby")) type = "lobby";
      else if (nameLower.includes("nhà hàng") || nameLower.includes("restaurant") || nameLower.includes("bếp")) type = "restaurant";
      else if (nameLower.includes("thang máy") || nameLower.includes("lift")) type = "elevator";
      else if (nameLower.includes("bể bơi") || nameLower.includes("pool")) type = "pool";
      else if (nameLower.includes("gym") || nameLower.includes("fitness")) type = "gym";

      location = await Location.create({
        name,
        type,
        floor: floor !== undefined ? floor : null,
        notes: `Import từ Excel - ${sheetName}`
      });
      console.log(`  📍 Tạo vị trí mới: "${name}" (Tầng ${floor !== undefined ? floor : "?"}, ${type})`);
      totalLocations++;
    }

    locationCache[cacheKey] = location;
    return location;
  }

  // Duyệt từng sheet
  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;
    const floor = FLOOR_MAP[sheetName];

    console.log(`\n📊 Xử lý sheet: ${sheetName} (Tầng ${floor !== undefined ? floor : "?"})`);

    let sheetAssets = 0;
    let sheetSkipped = 0;

    for (const row of worksheet.getRows(1, worksheet.rowCount) || []) {
      const values = row.values.slice(1); // bỏ index 0

      // Bỏ qua header, dòng trống, group header
      if (!isDataRow(values)) continue;

      const [stt, danhmuc, ten, tenKhac, mota, tenViTri, nhaCungCap, donVi, soLuong, tinhTrang, keHoach] = values;

      if (!ten || !tenViTri) {
        sheetSkipped++;
        continue;
      }

      // 1. Upsert Location
      const location = await upsertLocation(String(tenViTri).trim(), floor, sheetName);
      if (!location) {
        sheetSkipped++;
        continue;
      }

      // 2. Tạo mã asset tự động
      const assetCode = `${sheetName.replace("TẦNG ", "T")}-${String(stt).padStart(3, "0")}`;

      // 3. Upsert Asset (tránh trùng)
      let asset = await Asset.findOne({ code: assetCode });

      const intervalDays = getIntervalDays(String(keHoach || ""));
      const nextMaintenanceDate = new Date();
      nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + intervalDays);

      if (!asset) {
        asset = await Asset.create({
          name: String(ten).trim(),
          code: assetCode,
          category: getCategory(danhmuc ? String(danhmuc) : ""),
          locationId: location._id,
          brand: "",
          model: String(tenKhac || "").trim().slice(0, 100),
          notes: String(mota || "").trim().slice(0, 500),
          maintenanceIntervalDays: intervalDays,
          nextMaintenanceDate,
          status: tinhTrang && String(tinhTrang).toLowerCase().includes("hỏng") ? "broken" : "active",
          totalRepairCost: 0
        });
        sheetAssets++;
        totalAssets++;
      }

      // 4. Tạo Preventive Plan nếu có kế hoạch BTBD
      if (keHoach && String(keHoach).trim() && intervalDays > 0) {
        const planExists = await PreventivePlan.findOne({ assetId: asset._id });
        if (!planExists) {
          await PreventivePlan.create({
            name: `Bảo trì định kỳ - ${String(ten).trim()}`,
            description: String(mota || "").trim().slice(0, 300),
            assetId: asset._id,
            locationId: location._id,
            intervalDays,
            nextDueDate: nextMaintenanceDate,
            priority: intervalDays <= 30 ? "high" : intervalDays <= 90 ? "medium" : "low",
            isActive: true,
            checklist: [{ item: "Vệ sinh định kỳ", done: false }],
            createdBy: adminUser._id
          });
          totalPlans++;
        }
      }
    }

    console.log(`  ✅ ${sheetAssets} thiết bị | ⏭️ ${sheetSkipped} bỏ qua`);
    skipped += sheetSkipped;
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 IMPORT HOÀN TẤT!");
  console.log(`  📍 Vị trí mới:    ${totalLocations}`);
  console.log(`  📦 Thiết bị mới:  ${totalAssets}`);
  console.log(`  📅 Kế hoạch BT:   ${totalPlans}`);
  console.log(`  ⏭️  Bỏ qua:        ${skipped}`);
  console.log("=".repeat(50));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Lỗi:", err.message);
  process.exit(1);
});