import rateLimit from "../../utils/rate-limit";
const Hash = require("ipfs-only-hash");
const validate = require("jsonschema").validate;
const guildProposalSchema = require("../../utils/guilds-proposal.json");

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 50, // Max 50 users per second
});

export default async function handler(req, res) {
  try {
    // Check rate limiter
    try {
      await limiter.check(res, 20, "CACHE_TOKEN");
    } catch {
      throw { code: 429, message: "Rate limited" };
    }
    // Check origin is on whitelist
    if (!process.env["WHITELIST"].includes(req.headers.origin)) {
      throw { code: 403, message: "Origin not allowed" };
    }
    const data = req.body;
    // Validate schema
    const validationResult = validate(data, guildProposalSchema);
    if (validationResult.errors.length > 0)
      throw { code: 403, message: validationResult.errors[0] };
    // Validate hash
    const hash = await Hash.of(JSON.stringify(data), { cidVersion: 1 });
    if (hash !== req.query.cid)
      throw { code: 403, message: "Hash not matching" };
    // Validate size of data
    const size = Buffer.byteLength(JSON.stringify(data));
    if (size > 20000) throw { code: 403, message: "Data too big" };
    // Fetch all nodes
    const nodesArr = [];
    let numberUndefined = false;
    for (let i = 1; numberUndefined < 5; i++) {
      const array = process.env[`NODE_${i}`]?.split(",");
      if (!array) {
        numberUndefined++;
      } else {
        if (array.length > 3) {
          console.warn("Looks like too many commas in NODE_" + i);
        } else {
          nodesArr.push(array);
        }
      }
    }
    // Send pin requests
    nodesArr.forEach((node) => {
      fetch(`https://${node[0]}/pins/${req.query.cid}`, {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${node[1]}:${node[2]}`, "binary").toString("base64"),
        },
      });
    });
    return res
      .status(200)
      .json({ cid: req.query.cid, submittedTo: nodesArr.length });
  } catch (e) {
    console.error({ e });
    return res.status(e.code).json({ error: e.message });
  }
}
