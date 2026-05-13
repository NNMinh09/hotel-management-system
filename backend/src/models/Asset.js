import mongoose from "mongoose";

const maintenanceHistorySchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: "maintenancerequests", default: null },
  title: { type: String, default: "" },
  type: { type: String, default: "repair" },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  createdAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  resolution: { type: String, default: "" },
  status: { type: String, default: "completed" },
  cost: {
    labor: { type: Number, default: 0 },
    parts: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  images: [String],
}, { _id: true, versionKey: false });

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  category: { type: String, enum: ["hvac", "electrical", "plumbing", "elevator", "furniture", "appliance", "other"], required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: "locations", required: true },
  brand: { type: String, default: "" },
  model: { type: String, default: "" },
  serialNumber: { type: String, default: "" },
  purchaseDate: { type: Date, default: null },
  warrantyExpiry: { type: Date, default: null },
  maintenanceIntervalDays: { type: Number, default: 90 },
  lastMaintenanceDate: { type: Date, default: null },
  nextMaintenanceDate: { type: Date, default: null },
  status: { type: String, enum: ["active", "under_maintenance", "broken", "retired"], default: "active" },
  images: [String],
  notes: { type: String, default: "" },
  totalRepairCost: { type: Number, default: 0 },
  maintenanceHistory: [maintenanceHistorySchema],
}, { timestamps: true, versionKey: false });

export default mongoose.model("assets", assetSchema);