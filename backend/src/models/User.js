import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  phone:    { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin","staff","technician"], default: "staff" },
  specialization: { type: String, enum: ["electrical","plumbing","hvac","general","elevator",null], default: null },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String, default: null }
}, { timestamps: true, versionKey: false });
export default mongoose.model("users", userSchema);
