import { ingestMtr } from "./mtr";
import { ingestKmb } from "./kmb";
import { ingestCitybus } from "./citybus";
import { ingestTram } from "./tram";
import { ingestGmb } from "./gmb";
import { ingestRvdPrices, ingestRvdStock, ingestRvdAge } from "./rvd";

async function runIngestion() {
  console.log("=== Starting data ingestion ===\n");
  const start = Date.now();

  const arg = process.argv[2]; // optional: "transport", "rvd", "gmb", or omit for all

  try {
    if (!arg || arg === "transport") {
      await ingestMtr();
      console.log("");
      await ingestKmb();
      console.log("");
      await ingestTram();
      console.log("");
      await ingestCitybus();
      console.log("");
    }

    if (!arg || arg === "gmb") {
      await ingestGmb();
      console.log("");
    }

    if (!arg || arg === "rvd") {
      await ingestRvdPrices();
      console.log("");
      await ingestRvdStock();
      console.log("");
      await ingestRvdAge();
      console.log("");
    }
  } catch (err) {
    console.error("Ingestion error:", err);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Ingestion complete in ${elapsed}s ===`);
}

runIngestion();
