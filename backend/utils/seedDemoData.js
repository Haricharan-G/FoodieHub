// Adds demo restaurants (with menus, food items and sample reviews) to the database.
//
// Usage, from the backend folder:
//   node utils/seedDemoData.js
//
// Safe to run more than once: a restaurant whose name already exists is skipped.
// Restaurant names and reviews are made up. Coordinates are approximate
// neighbourhood centres in Bengaluru, stored as [longitude, latitude].

// Some networks refuse the DNS lookup MongoDB Atlas needs (same fix as server.js).
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);

const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../config/config.env"),
});

const mongoose = require("mongoose");
const Restaurant = require("../models/restaurant");
const FoodItem = require("../models/foodItem");
const MenuModel = require("../models/menu");

const STOCK = 25;

// Placeholder pictures; replace with real photo URLs whenever you like.
const img = (label, color) => ({
  public_id: "demo",
  url: `https://placehold.co/600x400/${color}/ffffff?text=${label
    .replace(/&/g, "and")
    .split(" ")
    .map(encodeURIComponent)
    .join("+")}`,
});

// [name, price in INR, description]
const DEMO = [
  {
    name: "Udupi Delight",
    isVeg: true,
    address: "12th Main Rd, Indiranagar, Bengaluru",
    coordinates: [77.6408, 12.9784],
    color: "d35400",
    reviews: [
      ["Anita", 5, "Best dosa in the area, crisp and hot."],
      ["Rahul", 4, "Good food, a little crowded on weekends."],
      ["Meera", 5, "The idli vada and filter coffee combo is perfect."],
    ],
    categories: {
      Breakfast: [
        ["Masala Dosa", 90, "Crisp rice crepe with a spiced potato filling."],
        ["Idli Vada", 70, "Two idlis and a vada with sambar and chutney."],
        ["Ghee Pongal", 85, "Creamy rice and lentil dish with pepper and ghee."],
      ],
      "Meals & Sweets": [
        ["Mini Meals", 150, "Rice, sambar, rasam, curd, two curries and papad."],
        ["Bisi Bele Bath", 110, "Karnataka-style spiced rice and lentil dish."],
        ["Mysore Pak", 60, "Rich gram flour and ghee sweet."],
      ],
    },
  },
  {
    name: "Biryani Junction",
    isVeg: false,
    address: "80 Feet Rd, Koramangala, Bengaluru",
    coordinates: [77.6245, 12.9352],
    color: "8e1b1b",
    reviews: [
      ["Karthik", 5, "Fragrant biryani with tender chicken."],
      ["Sneha", 4, "Generous portions and good flavour."],
      ["Imran", 4, "The mutton biryani was great, slightly spicy."],
    ],
    categories: {
      Biryani: [
        ["Chicken Dum Biryani", 260, "Slow-cooked basmati rice layered with spiced chicken."],
        ["Mutton Biryani", 340, "Tender mutton cooked dum style with whole spices."],
        ["Veg Biryani", 190, "Seasonal vegetables and aromatic rice."],
      ],
      "Starters & Sides": [
        ["Chicken 65", 220, "Spicy deep-fried chicken with curry leaves."],
        ["Paneer 65", 200, "Crisp, spicy paneer cubes."],
        ["Onion Raita", 40, "Cooling yoghurt with onion and cucumber."],
      ],
    },
  },
  {
    name: "Dosa Corner",
    isVeg: true,
    address: "4th Block, Jayanagar, Bengaluru",
    coordinates: [77.5838, 12.9308],
    color: "b7950b",
    reviews: [
      ["Divya", 4, "Crispy dosas and quick service."],
      ["Suresh", 5, "Great rava masala dosa, fair prices."],
    ],
    categories: {
      Dosas: [
        ["Plain Dosa", 60, "Thin, crisp dosa served with chutney and sambar."],
        ["Set Dosa", 80, "Soft, fluffy dosas, three to a plate."],
        ["Rava Masala Dosa", 100, "Crisp semolina dosa with a potato filling."],
      ],
      Beverages: [
        ["Filter Coffee", 35, "Strong South Indian coffee with frothy milk."],
        ["Badam Milk", 55, "Warm almond-flavoured milk."],
        ["Fresh Lime Soda", 45, "Sweet or salted, your choice."],
      ],
    },
  },
  {
    name: "Tandoor Tales",
    isVeg: false,
    address: "ITPL Main Rd, Whitefield, Bengaluru",
    coordinates: [77.75, 12.9698],
    color: "6e2c00",
    reviews: [
      ["Arjun", 5, "Smoky, juicy tandoori chicken."],
      ["Pooja", 4, "Butter chicken and naan were excellent."],
      ["Vikram", 3, "Tasty, but the wait was long."],
    ],
    categories: {
      Tandoor: [
        ["Tandoori Chicken (Half)", 280, "Chicken marinated in yoghurt and spices, clay-oven roasted."],
        ["Chicken Tikka", 260, "Boneless chicken cubes grilled in the tandoor."],
        ["Paneer Tikka", 220, "Marinated paneer, peppers and onions, grilled."],
      ],
      "Breads & Curries": [
        ["Butter Naan", 45, "Soft tandoor-baked bread brushed with butter."],
        ["Butter Chicken", 300, "Chicken in a creamy tomato and butter gravy."],
        ["Dal Makhani", 190, "Slow-cooked black lentils with cream."],
      ],
    },
  },
  {
    name: "Pasta Piazza",
    isVeg: false,
    address: "27th Main, HSR Layout, Bengaluru",
    coordinates: [77.6412, 12.9116],
    color: "1e8449",
    reviews: [
      ["Neha", 5, "Creamy Alfredo and wonderful garlic bread."],
      ["Rohan", 4, "Good pizza, cosy place."],
    ],
    categories: {
      Pasta: [
        ["Penne Arrabbiata", 240, "Penne in a spicy tomato and garlic sauce."],
        ["Creamy Alfredo Pasta", 270, "Fettuccine in a parmesan cream sauce."],
        ["Chicken Pesto Pasta", 300, "Pasta with basil pesto and grilled chicken."],
      ],
      "Pizza & Sides": [
        ["Margherita Pizza", 280, "Tomato, mozzarella and fresh basil."],
        ["Garlic Bread", 120, "Toasted bread with garlic butter and herbs."],
        ["Tiramisu", 160, "Coffee-soaked sponge with mascarpone cream."],
      ],
    },
  },
  {
    name: "Green Bowl",
    isVeg: true,
    address: "Margosa Rd, Malleshwaram, Bengaluru",
    coordinates: [77.5703, 13.0035],
    color: "117a65",
    reviews: [
      ["Lakshmi", 5, "Fresh, filling and healthy."],
      ["Aditya", 4, "Loved the quinoa bowl."],
      ["Farah", 4, "Nice salads and juices."],
    ],
    categories: {
      "Bowls & Salads": [
        ["Quinoa Veggie Bowl", 240, "Quinoa with roasted vegetables and a lemon dressing."],
        ["Greek Salad", 190, "Cucumber, tomato, olives and feta."],
        ["Paneer Rice Bowl", 220, "Rice with grilled paneer and sauteed vegetables."],
      ],
      "Juices & Soups": [
        ["Cold-Pressed Orange Juice", 120, "Fresh oranges, nothing added."],
        ["Tomato Basil Soup", 110, "Roasted tomato soup with basil."],
        ["Sweet Corn Soup", 100, "Light, creamy corn soup."],
      ],
    },
  },
  {
    name: "Chai & Chaat",
    isVeg: true,
    address: "Gandhi Bazaar, Basavanagudi, Bengaluru",
    coordinates: [77.5746, 12.9422],
    color: "7d3c98",
    reviews: [
      ["Deepak", 5, "Proper street-style pani puri."],
      ["Kavya", 4, "Great masala chai and bun maska."],
    ],
    categories: {
      Chaat: [
        ["Pani Puri", 60, "Crisp puris with spiced mint water."],
        ["Sev Puri", 70, "Flat puris topped with chutneys, onion and sev."],
        ["Dahi Puri", 80, "Puris filled with potato, yoghurt and chutneys."],
      ],
      "Chai & Snacks": [
        ["Masala Chai", 30, "Hot tea brewed with ginger and cardamom."],
        ["Samosa", 40, "Crisp pastry with a spiced potato filling."],
        ["Bun Maska", 50, "Soft bun with butter, perfect with chai."],
      ],
    },
  },
  {
    name: "Wok This Way",
    isVeg: false,
    address: "Hosur Rd, Electronic City, Bengaluru",
    coordinates: [77.6648, 12.8452],
    color: "21618c",
    reviews: [
      ["Sanjay", 4, "Tasty chilli chicken, quick delivery."],
      ["Ritu", 3, "Good noodles, a bit oily."],
      ["Manoj", 4, "Schezwan noodles hit the spot."],
    ],
    categories: {
      "Noodles & Rice": [
        ["Veg Hakka Noodles", 160, "Wok-tossed noodles with crunchy vegetables."],
        ["Chicken Fried Rice", 200, "Fried rice with chicken, egg and spring onion."],
        ["Schezwan Noodles", 180, "Spicy noodles in schezwan sauce."],
      ],
      Starters: [
        ["Chilli Chicken", 230, "Crispy chicken tossed in a hot garlic sauce."],
        ["Veg Manchurian", 170, "Vegetable dumplings in a tangy Indo-Chinese gravy."],
        ["Spring Rolls", 140, "Crunchy rolls with a vegetable filling."],
      ],
    },
  },
];

const seed = async () => {
  if (process.env.NODE_ENV === "PRODUCTION") {
    console.error("Refusing to seed demo data when NODE_ENV is PRODUCTION.");
    process.exit(1);
  }

  if (!process.env.DB_LOCAL_URI) {
    console.error("DB_LOCAL_URI is missing. Check backend/config/config.env.");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_LOCAL_URI);
  console.log("Connected to MongoDB");

  let added = 0;
  let skipped = 0;

  for (const r of DEMO) {
    if (await Restaurant.exists({ name: r.name })) {
      console.log(`skipped  ${r.name} (already exists)`);
      skipped++;
      continue;
    }

    const reviews = r.reviews.map(([name, rating, Comment]) => ({
      name,
      rating,
      Comment,
    }));
    const average =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    const restaurant = await Restaurant.create({
      name: r.name,
      isVeg: r.isVeg,
      address: r.address,
      location: { type: "Point", coordinates: r.coordinates },
      images: [img(r.name, r.color)],
      reviews,
      ratings: Math.round(average * 10) / 10,
      numOfReviews: reviews.length,
    });

    const menu = await MenuModel.create({ restaurant: restaurant._id, menu: [] });

    const sections = [];
    for (const [category, items] of Object.entries(r.categories)) {
      const ids = [];
      for (const [name, price, description] of items) {
        const food = await FoodItem.create({
          name,
          price,
          description,
          stock: STOCK,
          images: [img(name, r.color)],
          restaurant: restaurant._id,
          menu: menu._id,
        });
        ids.push(food._id);
      }
      sections.push({ category, items: ids });
    }

    menu.menu = sections;
    await menu.save();

    console.log(`added    ${r.name}`);
    added++;
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped.`);
  await mongoose.disconnect();
};

seed().catch(async (err) => {
  console.error("Seeding failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
