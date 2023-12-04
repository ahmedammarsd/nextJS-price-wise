"use server";

import { revalidatePath } from "next/cache";
import Product from "../models/product.models";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { User } from "@/types";
import { generateEmailBody, sendEmail } from "../nodemailer";

export async function scrapeAndStoreProduct(productUrl: string) {
  if (!productUrl) return; // check if found the url or productUrl

  try {
    connectToDB();

    // CALL ANOTHER FUNCTION TO SCRAP PRODUCT -
    const scrapedProduct = await scrapeAmazonProduct(productUrl);

    if (!scrapedProduct) return; // when no data found

    let product = scrapedProduct;

    // CHECK FOUND THE PRODUCT IN DB
    const existingProduct = await Product.findOne({ url: scrapedProduct.url });

    // WHEN FOUND PRODUCT UPDATE IT
    if (existingProduct) {
      const updatedPriceHistory: any = [
        ...existingProduct.priceHistory,
        { price: scrapedProduct.currentPrice },
      ];

      // STOR IN PRODUCT AND USE UPDTE TO IN DB
      product = {
        ...scrapedProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        avaregePrice: getAveragePrice(updatedPriceHistory),
      };
    }

    const newProduct = await Product.findOneAndUpdate(
      { url: scrapedProduct.url },
      product,
      { upsert: true, new: true }
    );

    // TO UPDATE THE PAGE AND CACHE IT ....
    revalidatePath(`/products/${newProduct._id}`);
  } catch (error: any) {
    //console.log(error);
    throw new Error(error);
  }
}

export async function getProductById(productId: String) {
  try {
    connectToDB();

    const product = await Product.findOne({ _id: productId });

    if (!product) return null;

    return product;
  } catch (error) {}
}

export async function getAllProducts() {
  try {
    connectToDB();

    const products = await Product.find();

    //console.log(products);
    return products;
  } catch (error) {
    console.log(error);
  }
}

export async function getSimilarProducts(productId: string) {
  try {
    connectToDB();

    const currentProducts = await Product.findById(productId);

    if (!currentProducts) return null;
    //console.log(products);

    const similarProducts = await Product.find({
      _id: { $ne: productId }, // $ne - mean not equal
    }).limit(3);
    return similarProducts;
  } catch (error) {
    console.log(error);
  }
}

export async function addUserEmailToProduct(
  productId: string,
  userEmail: string
) {
  try {
    // send our first email...
    const product = await Product.findById(productId);
    if (!product) return;

    const userExists = product.users.some(
      (user: User) => user.email === userEmail
    );

    if (!userExists) {
      product.users.push({ email: userEmail });
      await product.save();

      const emailContent = await generateEmailBody(product, "WELCOME"); // return the subject and body via the type "WELCOME"
      await sendEmail(emailContent, [userEmail]);
    }
  } catch (error) {
    console.log(error);
  }
}
