import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import Location from "../models/Location.js";
import Asset from "../models/Asset.js";
import PreventivePlan from "../models/PreventivePlan.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const CATEGORY_MAP = {
  "tủ điện": "electrical", "thiết bị điện": "electrical",
  "thiết bị điện khác": "electrical", "thiết bị kỹ thuật khác": "other",
  "thang máy": "elevator", "điều hòa": "hvac", "hvac": "hvac",
  "máy bơm": "plumbing", "hệ thống nước": "plumbing",
  "thiết bị bếp": "appliance", "âm thanh": "other",
  "ánh sáng": "electrical", "pccc": "other"
};

const INTERVAL_MAP = {
  "1 tháng": 30, "1 tháng/1 lần": 30, "1 tháng/ 1 lần": 30,
  "2 tháng": 60, "3 tháng": 90, "3 tháng/1 lần": 90,
  "3 tháng/ 1 lần": 90, "4 tháng": 120, "4 tháng / 1 lần": 120,
  "6 tháng": 180, "1 năm": 365, "12 tháng": 365
};

const FLOOR_MAP = {
  "TẦNG B": -1, "TẦNG G": 0, "TẦNG 2": 2, "TẦNG 3": 3,
  "TẦNG 4": 4, "TẦNG 5": 5, "TẦNG 6": 6, "TẦNG 7": 7,
  "TẦNG 8": 8, "TẦNG 9": 9, "TẦNG 10": 10, "TẦNG 11": 11,
  "TẦNG 12": 12, "TẦNG MÁI": 13
};

function getCategory(danhmuc) {
  if (!danhmuc) return "other";
  const lower = String(danhmuc).toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "other";
}

function getIntervalDays(kehoach) {
  if (!kehoach) return 90;
  const lower = String(kehoach).toLowerCase().trim();
  for (const [key, val] of Object.entries(INTERVAL_MAP)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return 90;
}

router.post("/excel", authenticate, authorize("admin"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Vui lòng chọn file Excel" });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const locationCache = {};
    let totalLocations = 0;
    let totalAssets = 0;
    let totalPlans = 0;
    let skipped = 0;
    const errors = [];

    async function upsertLocation(locationName, floor, sheetName) {
      if (!locationName?.trim()) return null;
      const name = String(locationName).trim();
      const cacheKey = name.toLowerCase();
      if (locationCache[cacheKey]) return locationCache[cacheKey];

      let location = await Location.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
      if (!location) {
        const nameLower = name.toLowerCase();
        let type = "other";
        if (nameLower.includes("phòng")) type = "room";
        else if (nameLower.includes("sảnh") || nameLower.includes("lobby")) type = "lobby";
        else if (nameLower.includes("nhà hàng") || nameLower.includes("bếp")) type = "restaurant";
        else if (nameLower.includes("thang máy")) type = "elevator";
        else if (nameLower.includes("bể bơi") || nameLower.includes("pool")) type = "pool";
        else if (nameLower.includes("gym")) type = "gym";

        location = await Location.create({
          name, type,
          floor: floor !== undefined ? floor : null,
          notes: `Import từ Excel - ${sheetName}`
        });
        totalLocations++;
      }
      locationCache[cacheKey] = location;
      return location;
    }

    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;
      const floor = FLOOR_MAP[sheetName.toUpperCase()];

      for (const row of worksheet.getRows(1, worksheet.rowCount) || []) {
        const values = row.values.slice(1);
        const stt = values[0];
        if (typeof stt !== "number" || !Number.isInteger(stt) || stt <= 0) continue;

        const [, danhmuc, ten, tenKhac, mota, tenViTri, , , soLuong, tinhTrang, keHoach] = values;
        if (!ten || !tenViTri) { skipped++; continue; }

        try {
          const location = await upsertLocation(String(tenViTri).trim(), floor, sheetName);
          if (!location) { skipped++; continue; }

          const assetCode = `${sheetName.replace("TẦNG ", "T").replace(" ", "")}-${String(stt).padStart(3, "0")}`;
          let asset = await Asset.findOne({ code: assetCode });

          const intervalDays = getIntervalDays(keHoach || "");
          const nextMaintenanceDate = new Date();
          nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + intervalDays);

          if (!asset) {
            asset = await Asset.create({
              name: String(ten).trim(),
              code: assetCode,
              category: getCategory(danhmuc),
              locationId: location._id,
              model: String(tenKhac || "").trim().slice(0, 100),
              notes: String(mota || "").trim().slice(0, 500),
              maintenanceIntervalDays: intervalDays,
              nextMaintenanceDate,
              status: tinhTrang && String(tinhTrang).toLowerCase().includes("hỏng") ? "broken" : "active",
              totalRepairCost: 0
            });
            totalAssets++;
          }

          if (keHoach && intervalDays > 0) {
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
                createdBy: req.user.id
              });
              totalPlans++;
            }
          }
        } catch (err) {
          errors.push(`Sheet ${sheetName}, STT ${stt}: ${err.message}`);
        }
      }
    }

    res.json({
      message: "Import hoàn tất!",
      result: { totalLocations, totalAssets, totalPlans, skipped, errors }
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xử lý file: " + err.message });
  }
});

export default router;