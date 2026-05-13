import mongoose from "mongoose";

const maintenanceRequestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },

  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },

  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "assets",
    default: null,
  },

  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "locations",
    required: true,
  },

  preventivePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "preventiveplans",
    default: null,
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },

  type: {
    type: String,
    enum: ["repair", "scheduled", "inspection"],
    default: "repair",
  },

  status: {
    type: String,
    enum: ["pending", "assigned", "in_progress", "waiting_parts", "completed", "cancelled"],
    default: "pending",
  },

  images: [String],

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    default: null,
  },
  assignedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  resolution: { type: String, default: "" },

  cost: {
    labor: { type: Number, default: 0 },
    parts: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },

  statusHistory: [
    {
      status: String,
      note: String,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true, versionKey: false });

export default mongoose.model("maintenancerequests", maintenanceRequestSchema);