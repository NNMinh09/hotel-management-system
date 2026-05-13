import mongoose from "mongoose";

const preventivePlanSchema = new mongoose.Schema({
  name: { type: String, required: true },        // Tên kế hoạch
  description: { type: String, default: "" },

  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "assets",
    default: null
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "locations",
    required: true
  },

  // Chu kỳ
  intervalDays: { type: Number, required: true }, // Lặp lại mỗi N ngày
  nextDueDate: { type: Date, required: true },    // Ngày thực hiện tiếp theo
  lastDoneDate: { type: Date, default: null },    // Lần cuối đã làm

  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    default: null
  },

  isActive: { type: Boolean, default: true },

  // Checklist việc cần làm
  checklist: [{ item: String, done: Boolean }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true
  }

}, { timestamps: true, versionKey: false });

export default mongoose.model("preventiveplans", preventivePlanSchema);