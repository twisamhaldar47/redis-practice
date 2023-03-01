const express = require("express");
const axios = require("axios");
const redis = require("redis");

const app = express();

const port = 3000 || process.env.PORT;

let redisClient;

(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", err => {
    console.log(err);
  });
  await redisClient.connect();
})();

const fetchApiData = async species => {
  try {
    const response = await axios.get(
      `https://www.fishwatch.gov/api/species/${species}`
    );
    console.log("req sent to the  API");
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

const getSpeciesDetails = async (req, res) => {
  const species = req.params.species;
  let results;
  let isCached = false;
  try {
    const cachedResults = await redisClient.get(species);
    if (cachedResults) {
      isCached = true;
      results = JSON.parse(cachedResults);
    } else {
      results = await fetchApiData(species);
      if (results.length === 0) {
        throw "API returned empty array";
      }
      await redisClient.set(species, JSON.stringify(results));
    }
    res.json({
      fromCache: isCached,
      data: results
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("Data Unavailable");
  }
};

app.get("/fish/:species", getSpeciesDetails);

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
