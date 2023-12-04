import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  //curl --proxy brd.superproxy.io:22225 --proxy-user brd-customer-hl_3bbb94bf-zone-unblocker:fe9skxnres9m -k https://lumtest.com/myip.json

  // BRIGHTDATA PROXY CONFIGURATION - FOR HELP ME FOR SCRAP THE DATA
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;
  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    // fetch the product page
    const response = await axios.get(url, options);
    // console.log("====================================");
    // console.log(response.data); // its source code for page
    // console.log("====================================");
    const $ = cheerio.load(response.data);

    // extract the product title
    const title = $("#productTitle").text().trim();
    const currentPrice = extractPrice(
      // its function pass elements for check and remove the letters from price
      $(".priceToPay span.a-price-whole"),
      $("a.size.base.a-color-price"),
      $("a.button-selected .a-color-base"),
      $(".a-price.a-text-price")
    );
    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $(".a-price.a-text-price span.a-offscreen"),
      $("#listPrice"),
      $("#priceblock_dealprice"),
      $(".a-size-base.a-color-price")
    );
    const outOfStock =
      $("#availability span").text().trim().toLowerCase() ===
      "currently unavailable";
    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";
    const imageUrls = Object.keys(JSON.parse(images));
    const currency = extractCurrency($(".a-price-symbol"));
    const discountRate = $(".savingsPercentage").text().replace(/[-%]/g, "");
    const stars = $("#acrPopover span.a-size-base").text().trim().slice(0, 3);
    const reviewRatings = $("#acrCustomerReviewText").text().trim();
    //   .split(" ") STOP THIS AND DECIDE TO USE BULT IN FUNC : PARSEINT()
    //   .slice(0, 2)
    //   .join(" ");
    const description = extractDescription($);
    //console.log(stars, parseInt(reviewRatings));

    // Construct data object with scraped information
    const data = {
      url,
      title,
      currency: currency || "$",
      image: imageUrls[0],
      description,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: "category",
      reviewsCount: parseInt(reviewRatings),
      starts: stars,
      isOutOfStock: outOfStock,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      avaregePrice: Number(currentPrice) || Number(originalPrice),
    };
    //console.log("the title : =============", title);
    // console.log(data);
    // console.log("the title ======= : ", {
    //   title,
    //   currentPrice,
    //   originalPrice,
    //   outOfStock,
    //   imageUrls,
    //   currency,
    //   discountRate,
    // });
    return data;
  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
