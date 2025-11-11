const BASE_URL = "https://api.exchangerate-api.com/v4/latest";

window.addEventListener("DOMContentLoaded", () => {
  const dropdowns = document.querySelectorAll(".select-container select");
  const btn = document.querySelector("form button");
  const fromCurrency = document.querySelector(".from-currency select");
  const toCurrency = document.querySelector(".to-currency select");
  const msg = document.querySelector(".message");

  if (!fromCurrency || !toCurrency || !btn || dropdowns.length === 0 || !msg) {
    console.error("❌ Missing HTML elements. Check class names/structure in index.html.");
    return;
  }

  const codesFromFile = window.countryList && typeof window.countryList === "object" ? window.countryList : null;

  const currencyToFlagFallback = {
    USD: "US", EUR: "EU", GBP: "GB", BDT: "BD", AUD: "AU", INR: "IN", JPY: "JP",
    CAD: "CA", CNY: "CN", SGD: "SG", NZD: "NZ", CHF: "CH", KRW: "KR", RUB: "RU",
    AED: "AE", SEK: "SE", NOK: "NO", DKK: "DK", TRY: "TR", MXN: "MX", BRL: "BR",
    ZAR: "ZA", THB: "TH", IDR: "ID", MYR: "MY", PHP: "PH", PLN: "PL", CZK: "CZ"
  };

  async function getCurrencyList() {
    if (codesFromFile) {
      try {
        const keys = Object.keys(codesFromFile).map(k => k.toUpperCase()).sort();
        if (keys.length) return keys;
      } catch (e) {
        console.warn("codes.js present but unreadable, falling back.", e);
      }
    }

    // Try to get list from API
    try {
      const res = await fetch(`${BASE_URL}/USD`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.rates) {
        const keys = Object.keys(data.rates).sort();
        if (keys.length) return keys;
      }
    } catch (err) {
      console.warn("Could not load currency list from API, using fallback mapping.", err);
    }

    return Object.keys(currencyToFlagFallback).sort();
  }

  function flagCodeForCurrency(curr) {
    curr = (curr || "").toUpperCase();
    if (codesFromFile) {
      const val = codesFromFile[curr] ?? codesFromFile[curr.toLowerCase()];
      if (val && typeof val === "string") {
        const maybe = val.trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(maybe)) return maybe;
      }
    }
    if (currencyToFlagFallback[curr]) return currencyToFlagFallback[curr];
    if (curr.length >= 2) return curr.slice(0, 2);
    return "UN";
  }

  (async function loadAndPopulate() {
    const codes = await getCurrencyList();

    if (!codes.includes("USD")) codes.unshift("USD");
    if (!codes.includes("BDT")) codes.push("BDT");

    for (const select of dropdowns) {
      select.innerHTML = "";

      for (const code of codes) {
        const opt = document.createElement("option");
        opt.value = code;
        const name = codesFromFile ? (codesFromFile[code] || codesFromFile[code.toLowerCase()]) : null;
        opt.textContent = name ? `${code} — ${name}` : code;
        if (select.name === "from" && code === "USD") opt.selected = true;
        if (select.name === "to" && code === "BDT") opt.selected = true;
        select.appendChild(opt);
      }

      updateFlag(select);
      select.addEventListener("change", () => updateFlag(select));
    }
  })();

  function updateFlag(selectEl) {
    if (!selectEl) return;
    const curr = (selectEl.value || "").toUpperCase();
    let countryCode = flagCodeForCurrency(curr);
    if (curr === "EUR") countryCode = "EU";
    countryCode = (countryCode || "UN").toUpperCase();

    const img = selectEl.closest(".select-container")?.querySelector("img");
    if (!img) return;
    img.src = `https://flagsapi.com/${countryCode}/flat/64.png`;
    img.alt = `${curr} flag`;
  }

  async function getExchangeRate(from, to) {
    const url = `${BASE_URL}/${from.toUpperCase()}`;
    console.log("Fetching from:", url);
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API returned status ${res.status}`);
    
    const data = await res.json();
    console.log("API response:", data);
    
    if (!data.rates || !data.rates[to.toUpperCase()]) {
      throw new Error(`Rate for ${to.toUpperCase()} not found`);
    }
    
    return data.rates[to.toUpperCase()];
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const amountInput = document.querySelector(".amount input");
    let amount = parseFloat((amountInput?.value ?? "").trim());
    if (!isFinite(amount) || amount <= 0) {
      amount = 1;
      if (amountInput) amountInput.value = "1";
    }

    const fromVal = fromCurrency.value || "USD";
    const toVal = toCurrency.value || "BDT";

    msg.innerText = "Fetching rate...";

    try {
      const rate = await getExchangeRate(fromVal, toVal);
      const converted = rate * amount;
      
      console.log(`Rate: ${rate}, Amount: ${amount}, Converted: ${converted}`);
      
      const decimals = Math.abs(converted) < 0.01 ? 6 : 2;
      const convertedStr = converted.toFixed(decimals);

      msg.innerText = `${amount} ${fromVal} = ${convertedStr} ${toVal}`;
    } catch (err) {
      console.error("Conversion error:", err);
      msg.innerText = `⚠️ Error: ${err.message}`;
    }
  });
});
