export default function handler(req, res) {
  const nodesArr = [];
  let numberUndefined = false;
  for (let i = 1; numberUndefined < 5; i++) {
    const array = process.env[`NODE_${i}`]?.split(",");
    if (!array) {
      numberUndefined++;
    } else {
      if (array.length > 3) {
        console.error("Looks like too many commas in NODE_" + i);
      } else {
        nodesArr.push(array);
      }
    }
  }
  console.log(nodesArr);
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
  res.status(200).json({ cid: req.query.cid, submittedTo: nodesArr.length });
}

// Add /allocations to the API to see the current allocations
// Find way to prevent users from accessing the API without authorization
