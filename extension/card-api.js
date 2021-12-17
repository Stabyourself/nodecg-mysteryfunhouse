const ctx = require("./nodecg");
const nodecg = ctx.get();

const router = nodecg.Router();

router.use((req, res, next) => {
  res.append("Access-Control-Allow-Origin", ["*"]);
  res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.append("Access-Control-Allow-Headers", "Content-Type");
  next();
});

router.get("/card-api", (req, res) => {
  let allInfo = nodecg.readReplicant("allInfo");
  res.set("Access-Control-Allow-Origin", "*");
  res.send(allInfo);
});

nodecg.mount("/", router);
