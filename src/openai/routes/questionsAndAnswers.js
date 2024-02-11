import express from "express";

let router = express.Router();

router.get("/search/:searchText", async (req, res) => {
  console.log(req.params.searchText);

  return res.status(200).send("Success");
});

export default router;
