#!/usr/bin/env node

/**
 * Fetch ALL available data from Cloud4India Admin API
 * Dynamically discovers all services and endpoints - no hardcoding
 */

const API_BASE = "https://portal.cloud4india.com/backend/api";
const API_KEY = "a0d9e098-8770-4ebc-8c19-b235bbeafe50|F0rvmob5ZLStO3XZOYDFLJcPx0CeFzpsxKk2bC9s8a83169c";

async function fetchAPI(endpoint) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      return { error: `${response.status} ${response.statusText}`, url };
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("CLOUD4INDIA API - COMPLETE DATA DISCOVERY (Dynamic)");
  console.log("=".repeat(80));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  const allData = {};

  // 1. Fetch all Rate Cards
  console.log("\n\n📋 1. FETCHING RATE CARDS...\n");
  const rateCardsResponse = await fetchAPI("/admin/rate-cards?limit=100");

  if (rateCardsResponse.data) {
    allData.rateCards = rateCardsResponse.data;
    console.log(`   Found ${rateCardsResponse.data.length} rate cards:`);
    for (const rc of rateCardsResponse.data) {
      console.log(`   - ${rc.name} (slug: ${rc.slug}, type: ${rc.card_type})`);
    }
  }

  // 2. Fetch all Cloud Provider Services (DYNAMIC SERVICE DISCOVERY)
  console.log("\n\n🔧 2. FETCHING CLOUD PROVIDER SERVICES (Dynamic Discovery)...\n");
  const servicesResponse = await fetchAPI("/admin/cloud-provider-services?limit=200");

  let allServices = [];
  if (servicesResponse.data) {
    allData.cloudProviderServices = servicesResponse.data;
    const serviceSet = new Set();
    for (const svc of servicesResponse.data) {
      if (svc.name && typeof svc.name === 'string') {
        serviceSet.add(svc.name);
      }
    }
    allServices = Array.from(serviceSet).sort();
    console.log(`   Found ${allServices.length} unique services from API:`);
    for (const svc of allServices) {
      console.log(`   - ${svc}`);
    }
  }

  // 3. Fetch Cloud Provider Setups
  console.log("\n\n☁️  3. FETCHING CLOUD PROVIDER SETUPS...\n");
  const setupsResponse = await fetchAPI("/admin/cloud-provider-setups?limit=100");

  if (setupsResponse.data) {
    allData.cloudProviderSetups = setupsResponse.data;
    console.log(`   Found ${setupsResponse.data.length} cloud provider setups:`);
    for (const setup of setupsResponse.data) {
      console.log(`   - ${setup.name} (version: ${setup.version})`);
    }
  }

  // 4. Fetch Billing Cycles
  console.log("\n\n⏱️  4. FETCHING BILLING CYCLES...\n");
  const cyclesResponse = await fetchAPI("/admin/billing-cycles?limit=100");

  if (cyclesResponse.data) {
    allData.billingCycles = cyclesResponse.data;
    console.log(`   Found ${cyclesResponse.data.length} billing cycles:`);
    for (const cycle of cyclesResponse.data) {
      console.log(`   - ${cycle.name} (${cycle.duration} ${cycle.unit})`);
    }
  }

  // 5. Fetch Currencies
  console.log("\n\n💰 5. FETCHING CURRENCIES...\n");
  const currenciesResponse = await fetchAPI("/admin/currencies?limit=100");

  if (currenciesResponse.data) {
    allData.currencies = currenciesResponse.data;
    console.log(`   Found ${currenciesResponse.data.length} currencies:`);
    for (const curr of currenciesResponse.data) {
      console.log(`   - ${curr.name} (${curr.currency_name})`);
    }
  }

  // 6. Fetch Plan Categories
  console.log("\n\n📁 6. FETCHING PLAN CATEGORIES...\n");
  const categoriesResponse = await fetchAPI("/admin/plan-categories?limit=100");

  if (categoriesResponse.data) {
    allData.planCategories = categoriesResponse.data;
    console.log(`   Found ${categoriesResponse.data.length} plan categories:`);
    for (const cat of categoriesResponse.data) {
      console.log(`   - ${cat.name} (slug: ${cat.slug})`);
    }
  }

  // 7. Fetch Storage Categories
  console.log("\n\n💾 7. FETCHING STORAGE CATEGORIES...\n");
  const storageCatsResponse = await fetchAPI("/admin/storage-categories?limit=100");

  if (storageCatsResponse.data) {
    allData.storageCategories = storageCatsResponse.data;
    console.log(`   Found ${storageCatsResponse.data.length} storage categories:`);
    for (const cat of storageCatsResponse.data) {
      console.log(`   - ${cat.name} (slug: ${cat.slug})`);
    }
  }

  // 8. Fetch Templates
  console.log("\n\n🖼️  8. FETCHING TEMPLATES...\n");
  const templatesResponse = await fetchAPI("/admin/templates?limit=200");

  if (templatesResponse.data) {
    allData.templates = templatesResponse.data;
    console.log(`   Found ${templatesResponse.data.length} templates:`);
    const sampleTemplates = templatesResponse.data.slice(0, 5).map(t => t.name).join(", ");
    console.log(`   Sample: ${sampleTemplates}...`);
  }

  // 9. Fetch Operating Systems
  console.log("\n\n💻 9. FETCHING OPERATING SYSTEMS...\n");
  const osResponse = await fetchAPI("/admin/operating-systems?limit=100");

  if (osResponse.data) {
    allData.operatingSystems = osResponse.data;
    console.log(`   Found ${osResponse.data.length} operating systems:`);
    for (const os of osResponse.data) {
      console.log(`   - ${os.name}`);
    }
  }

  // ============================================================
  // FETCH DATA FOR EACH RATE CARD
  // ============================================================

  console.log("\n\n" + "=".repeat(80));
  console.log("📦 FETCHING ALL DATA FOR EACH RATE CARD");
  console.log("=".repeat(80));

  allData.dataByRateCard = {};

  for (const rateCard of (allData.rateCards || [])) {
    console.log(`\n\n${"─".repeat(70)}`);
    console.log(`📋 RATE CARD: ${rateCard.name} (${rateCard.slug})`);
    console.log(`${"─".repeat(70)}`);

    allData.dataByRateCard[rateCard.slug] = {
      plans: {},
      products: [],
      licences: [],
      unitPricings: [],
    };

    // ---- A. Fetch Plans for each Service ----
    console.log(`\n   📦 A. PLANS BY SERVICE:`);

    const servicesWithData = [];
    const servicesEmpty = [];
    let totalPlans = 0;

    for (const service of allServices) {
      const plansResponse = await fetchAPI(
        `/admin/plans/service/${encodeURIComponent(service)}?planable_type=RateCard&planable=${rateCard.slug}&include=prices&limit=500`
      );

      if (plansResponse.data && plansResponse.data.length > 0) {
        allData.dataByRateCard[rateCard.slug].plans[service] = plansResponse.data;
        totalPlans += plansResponse.data.length;

        const firstPlan = plansResponse.data[0];
        const priceInfo = (firstPlan.hourly_price || firstPlan.monthly_price)
          ? ` - ₹${firstPlan.monthly_price}/mo`
          : '';
        servicesWithData.push({
          service,
          count: plansResponse.data.length,
          sample: firstPlan.name,
          price: priceInfo
        });
      } else {
        allData.dataByRateCard[rateCard.slug].plans[service] = [];
        servicesEmpty.push(service);
      }
    }

    // Print services WITH data
    console.log(`\n      ✅ SERVICES WITH DATA (${servicesWithData.length}):`);
    for (const s of servicesWithData) {
      console.log(`         ✓ ${s.service}: ${s.count} plans (${s.sample}${s.price})`);
    }

    // Print services WITHOUT data
    console.log(`\n      ❌ SERVICES WITH NO DATA (${servicesEmpty.length}):`);
    for (const serviceName of servicesEmpty) {
      console.log(`         ✗ ${serviceName}: 0 plans`);
    }

    console.log(`\n      📊 Total Plans: ${totalPlans}`);

    // ---- B. Fetch Products ----
    console.log(`\n   🛒 B. PRODUCTS:`);
    const productsResponse = await fetchAPI(
      `/admin/products?planable_type=RateCard&planable=${rateCard.slug}&limit=200`
    );

    if (productsResponse.data && productsResponse.data.length > 0) {
      allData.dataByRateCard[rateCard.slug].products = productsResponse.data;
      console.log(`      Found ${productsResponse.data.length} products:`);
      for (const product of productsResponse.data) {
        const price = product.prices?.[1]?.amount || product.prices?.[0]?.amount || 'N/A';
        console.log(`         - ${product.name} (₹${price}/mo)`);
      }
    } else {
      console.log(`      No products found`);
    }

    // ---- C. Fetch Licences ----
    console.log(`\n   📜 C. LICENCES:`);
    const licencesResponse = await fetchAPI(
      `/admin/licences?planable_type=RateCard&planable=${rateCard.slug}&limit=200`
    );

    if (licencesResponse.data && licencesResponse.data.length > 0) {
      allData.dataByRateCard[rateCard.slug].licences = licencesResponse.data;
      console.log(`      Found ${licencesResponse.data.length} licences:`);
      for (const licence of licencesResponse.data) {
        const price = licence.prices?.[0]?.price || 'N/A';
        console.log(`         - ${licence.name} (₹${price}/${licence.pricing_unit})`);
      }
    } else {
      console.log(`      No licences found`);
    }

    // ---- D. Fetch Unit Pricings ----
    console.log(`\n   💵 D. UNIT PRICINGS:`);
    const unitPricingsResponse = await fetchAPI(
      `/admin/unit-pricings?planable_type=RateCard&planable=${rateCard.slug}&limit=200`
    );

    if (unitPricingsResponse.data && unitPricingsResponse.data.length > 0) {
      allData.dataByRateCard[rateCard.slug].unitPricings = unitPricingsResponse.data;
      console.log(`      Found ${unitPricingsResponse.data.length} unit pricing configs`);
    } else {
      console.log(`      No unit pricings found`);
    }
  }

  // ============================================================
  // FINAL SUMMARY
  // ============================================================

  console.log("\n\n" + "=".repeat(80));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(80));

  console.log(`\n   Rate Cards: ${allData.rateCards?.length || 0}`);
  console.log(`   Cloud Provider Services: ${allServices.length}`);
  console.log(`   Cloud Provider Setups: ${allData.cloudProviderSetups?.length || 0}`);
  console.log(`   Billing Cycles: ${allData.billingCycles?.length || 0}`);
  console.log(`   Currencies: ${allData.currencies?.length || 0}`);
  console.log(`   Plan Categories: ${allData.planCategories?.length || 0}`);
  console.log(`   Storage Categories: ${allData.storageCategories?.length || 0}`);
  console.log(`   Templates: ${allData.templates?.length || 0}`);
  console.log(`   Operating Systems: ${allData.operatingSystems?.length || 0}`);

  console.log("\n   Data by Rate Card:");
  for (const [rcSlug, data] of Object.entries(allData.dataByRateCard || {})) {
    let totalPlans = 0;
    let servicesWithPlans = 0;
    for (const [svc, plans] of Object.entries(data.plans || {})) {
      if (plans.length > 0) {
        totalPlans += plans.length;
        servicesWithPlans++;
      }
    }
    console.log(`   - ${rcSlug}:`);
    console.log(`       Plans: ${totalPlans} (across ${servicesWithPlans} services)`);
    console.log(`       Products: ${data.products?.length || 0}`);
    console.log(`       Licences: ${data.licences?.length || 0}`);
    console.log(`       Unit Pricings: ${data.unitPricings?.length || 0}`);
  }

  // Save full data to JSON file
  const outputPath = "/root/pricing/scripts/api-data-dump.json";
  const fs = await import("fs");
  fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));
  console.log(`\n   ✅ Full data saved to: ${outputPath}`);

  console.log("\n" + "=".repeat(80));
  console.log("DONE");
  console.log("=".repeat(80));
}

main().catch(console.error);
