import express from "express";
const router = express.Router();

// Route chạy thử
router.get("/test", (req, res) => {
    res.json({ message: "Route Export đang hoạt động!" });
});

export default router;