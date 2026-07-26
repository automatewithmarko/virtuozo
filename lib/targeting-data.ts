/**
 * Targeting catalogs, modeled on Meta's detailed-targeting taxonomy.
 * Swapped for live Targeting Search API results at integration time.
 */

import { COUNTRY_NAMES } from "./countries";

/** UI-facing country names, derived from the same ISO codes Meta targets. */
export const COUNTRIES: string[] = COUNTRY_NAMES;

export const POPULAR_COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Spain",
];

export interface InterestCategory {
  name: string;
  interests: string[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    name: "Business and industry",
    interests: [
      "Advertising", "Agriculture", "Architecture", "Aviation", "Banking",
      "Construction", "Design", "Economics", "Engineering",
      "Entrepreneurship", "Finance", "Healthcare", "Higher education",
      "Marketing", "Online advertising", "Personal finance", "Real estate",
      "Retail", "Sales", "Science", "Small business",
    ],
  },
  {
    name: "Entertainment",
    interests: [
      "Action movies", "Anime", "Comedy", "Concerts", "Country music",
      "Dance", "Documentaries", "Electronic music", "Hip hop music",
      "Horror movies", "Jazz", "Live events", "Movies", "Music",
      "Music festivals", "Musical theatre", "Pop music", "Reading",
      "Rock music", "TV shows", "Video games",
    ],
  },
  {
    name: "Family and relationships",
    interests: [
      "Dating", "Family", "Fatherhood", "Friendship", "Marriage",
      "Motherhood", "Parenting", "Weddings",
    ],
  },
  {
    name: "Fitness and wellness",
    interests: [
      "Bodybuilding", "CrossFit", "Gyms", "Meditation", "Mental health",
      "Nutrition", "Physical exercise", "Physical fitness", "Pilates",
      "Running", "Weight training", "Yoga", "Zumba",
    ],
  },
  {
    name: "Food and drink",
    interests: [
      "Baking", "Barbecue", "Beer", "Coffee", "Cooking", "Desserts",
      "Fast food", "Organic food", "Pizza", "Restaurants", "Seafood",
      "Tea", "Vegan cuisine", "Vegetarianism", "Wine",
    ],
  },
  {
    name: "Hobbies and activities",
    interests: [
      "Arts and crafts", "Board games", "Camping", "Chess", "DIY",
      "Drawing", "Fishing", "Gardening", "Home improvement", "Hunting",
      "Painting", "Photography", "Travel", "Woodworking", "Writing",
    ],
  },
  {
    name: "Shopping and fashion",
    interests: [
      "Beauty", "Boutiques", "Clothing", "Cosmetics", "Coupons",
      "Fashion accessories", "Handbags", "Jewelry", "Luxury goods",
      "Online shopping", "Shoes", "Shopping", "Skincare", "Sneakers",
      "Streetwear", "Sunglasses", "Watches",
    ],
  },
  {
    name: "Sports and outdoors",
    interests: [
      "American football", "Baseball", "Basketball", "Boxing", "Cycling",
      "Football (soccer)", "Golf", "Hiking", "Ice hockey", "Martial arts",
      "Mountain biking", "Skiing", "Snowboarding", "Surfing", "Swimming",
      "Tennis", "Volleyball",
    ],
  },
  {
    name: "Technology",
    interests: [
      "Artificial intelligence", "Computers", "Consumer electronics",
      "Cryptocurrency", "E-commerce", "Gadgets", "Mobile phones",
      "Smartphones", "Social media", "Software", "Video streaming",
      "Web development",
    ],
  },
];

export interface InterestEntry {
  name: string;
  category: string;
}

export const ALL_INTERESTS: InterestEntry[] = INTEREST_CATEGORIES.flatMap(
  (c) => c.interests.map((name) => ({ name, category: c.name }))
);
