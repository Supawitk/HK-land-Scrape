import { ingestMtr } from "./mtr";
import { ingestKmb } from "./kmb";
import { ingestCitybus } from "./citybus";
import { ingestTram } from "./tram";

async function runIngestion() {
  console.log("=== Starting data ingestion ===\n");
  const start = Date.now();

  try {
    await ingestMtr();
    console.log("");
    await ingestKmb();
    console.log("");
    await ingestTram();
    console.log("");
    // Citybus is slower due to individual stop fetches - run last
    await ingestCitybus();
  } catch (err) {
    console.error("Ingestion error:", err);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Ingestion complete in ${elapsed}s ===`);
}

runIngestion();
