import { ingestMtr } from "./mtr";
import { ingestKmb } from "./kmb";
import { ingestCitybus } from "./citybus";
import { ingestTram } from "./tram";
import { ingestGmb } from "./gmb";
import { ingestNlb } from "./nlb";
import { ingestLightRail } from "./light-rail";
import { ingestMtrBus } from "./mtr-bus";
import { ingestPeakTram, ingestFerryPiers } from "./peak-tram";
import { ingestRvdPrices, ingestRvdStock, ingestRvdAge } from "./rvd";
import { ingestPopulation } from "./population";
import { ingestSchools } from "./schools";
import { ingestHospitals } from "./hospitals";

async function runIngestion() {
  console.log("=== Starting data ingestion ===\n");
  const start = Date.now();

  const arg = process.argv[2]; // optional: "transport", "rvd", "gmb", "nlb", "lightrail", "population", "amenities", or omit for all

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
      await ingestNlb();
      console.log("");
      await ingestMtrBus();
      console.log("");
      await ingestLightRail();
      console.log("");
      await ingestPeakTram();
      console.log("");
      await ingestFerryPiers();
      console.log("");
    }

    if (!arg || arg === "gmb") {
      await ingestGmb();
      console.log("");
    }

    if (arg === "nlb") {
      await ingestNlb();
      console.log("");
    }

    if (arg === "lightrail") {
      await ingestLightRail();
      console.log("");
    }

    if (arg === "mtrbus") {
      await ingestMtrBus();
      console.log("");
    }

    if (arg === "ferry") {
      await ingestFerryPiers();
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

    if (!arg || arg === "population") {
      await ingestPopulation();
      console.log("");
    }

    if (!arg || arg === "amenities") {
      await ingestSchools();
      console.log("");
      await ingestHospitals();
      console.log("");
    }
  } catch (err) {
    console.error("Ingestion error:", err);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Ingestion complete in ${elapsed}s ===`);
}

runIngestion();
