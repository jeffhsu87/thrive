// Common foods with approximate values per serving (based on USDA FoodData Central averages).
// [name, serving, calories, protein g, carbs g, fat g, category]
const RAW = [
  // Breakfast & grains
  ['Oatmeal, cooked', '1 cup (234 g)', 166, 6, 28, 3.6, 'Grains'],
  ['Granola', '½ cup (60 g)', 270, 6, 38, 11, 'Grains'],
  ['Corn flakes with milk', '1 bowl', 230, 8, 40, 4, 'Grains'],
  ['Whole wheat bread', '1 slice (32 g)', 80, 4, 14, 1, 'Grains'],
  ['White bread', '1 slice (28 g)', 75, 2.5, 14, 1, 'Grains'],
  ['Bagel, plain', '1 medium (105 g)', 277, 11, 55, 1.4, 'Grains'],
  ['Pancakes', '2 medium', 350, 8, 50, 12, 'Grains'],
  ['White rice, cooked', '1 cup (158 g)', 205, 4.3, 45, 0.4, 'Grains'],
  ['Brown rice, cooked', '1 cup (195 g)', 216, 5, 45, 1.8, 'Grains'],
  ['Pasta, cooked', '1 cup (140 g)', 220, 8, 43, 1.3, 'Grains'],
  ['Quinoa, cooked', '1 cup (185 g)', 222, 8, 39, 3.6, 'Grains'],
  ['Tortilla, flour', '1 large (64 g)', 200, 5, 33, 5, 'Grains'],
  ['Crackers', '5 crackers', 80, 1.5, 12, 3, 'Grains'],
  // Protein
  ['Eggs, scrambled', '2 large', 182, 12, 2, 14, 'Protein'],
  ['Egg, boiled', '1 large', 78, 6.3, 0.6, 5.3, 'Protein'],
  ['Egg whites', '½ cup (120 g)', 63, 13, 1, 0, 'Protein'],
  ['Chicken breast, grilled', '150 g', 248, 46, 0, 5.4, 'Protein'],
  ['Chicken thigh, roasted', '1 thigh (110 g)', 230, 25, 0, 14, 'Protein'],
  ['Turkey, sliced', '3 oz (85 g)', 90, 17, 3, 1, 'Protein'],
  ['Salmon, baked', '150 g', 310, 34, 0, 18, 'Protein'],
  ['Tuna, canned in water', '1 can (142 g)', 150, 33, 0, 1, 'Protein'],
  ['Shrimp, cooked', '100 g', 99, 24, 0.2, 0.3, 'Protein'],
  ['Cod, baked', '150 g', 158, 35, 0, 1.3, 'Protein'],
  ['Beef steak, sirloin', '150 g', 310, 45, 0, 13, 'Protein'],
  ['Ground beef 90% lean', '100 g cooked', 217, 26, 0, 12, 'Protein'],
  ['Pork chop', '1 chop (145 g)', 280, 39, 0, 13, 'Protein'],
  ['Bacon', '3 slices', 130, 9, 0.4, 10, 'Protein'],
  ['Tofu, firm', '½ cup (126 g)', 180, 20, 3.5, 11, 'Protein'],
  ['Tempeh', '100 g', 192, 20, 8, 11, 'Protein'],
  ['Black beans, cooked', '1 cup (172 g)', 227, 15, 41, 0.9, 'Protein'],
  ['Lentils, cooked', '1 cup (198 g)', 230, 18, 40, 0.8, 'Protein'],
  ['Chickpeas, cooked', '1 cup (164 g)', 269, 14.5, 45, 4.2, 'Protein'],
  ['Protein shake (whey)', '1 scoop + water', 120, 24, 3, 1.5, 'Protein'],
  ['Protein bar', '1 bar (60 g)', 210, 20, 22, 7, 'Protein'],
  // Dairy
  ['Greek yogurt, plain nonfat', '170 g', 100, 17, 6, 0.7, 'Dairy'],
  ['Yogurt, fruit flavored', '150 g', 150, 6, 25, 3, 'Dairy'],
  ['Milk, 2%', '1 cup (244 ml)', 122, 8, 12, 4.8, 'Dairy'],
  ['Milk, skim', '1 cup (244 ml)', 83, 8, 12, 0.2, 'Dairy'],
  ['Oat milk', '1 cup (240 ml)', 120, 3, 16, 5, 'Dairy'],
  ['Almond milk, unsweetened', '1 cup (240 ml)', 30, 1, 1, 2.5, 'Dairy'],
  ['Cheddar cheese', '1 oz (28 g)', 113, 7, 0.4, 9.3, 'Dairy'],
  ['Mozzarella', '1 oz (28 g)', 85, 6.3, 0.6, 6.3, 'Dairy'],
  ['Cottage cheese, low fat', '1 cup (226 g)', 183, 24, 11, 5, 'Dairy'],
  ['Butter', '1 tbsp (14 g)', 102, 0.1, 0, 11.5, 'Dairy'],
  // Fruit
  ['Banana', '1 medium (118 g)', 105, 1.3, 27, 0.4, 'Fruit'],
  ['Apple', '1 medium (182 g)', 95, 0.5, 25, 0.3, 'Fruit'],
  ['Orange', '1 medium (131 g)', 62, 1.2, 15, 0.2, 'Fruit'],
  ['Blueberries', '1 cup (148 g)', 84, 1.1, 21, 0.5, 'Fruit'],
  ['Strawberries', '1 cup (152 g)', 49, 1, 12, 0.5, 'Fruit'],
  ['Grapes', '1 cup (151 g)', 104, 1.1, 27, 0.2, 'Fruit'],
  ['Mango', '1 cup (165 g)', 99, 1.4, 25, 0.6, 'Fruit'],
  ['Pineapple', '1 cup (165 g)', 82, 0.9, 22, 0.2, 'Fruit'],
  ['Watermelon', '1 cup (152 g)', 46, 0.9, 11.5, 0.2, 'Fruit'],
  ['Avocado', '½ fruit (100 g)', 160, 2, 8.5, 14.7, 'Fruit'],
  ['Raisins', '¼ cup (40 g)', 120, 1.2, 32, 0.2, 'Fruit'],
  // Vegetables
  ['Broccoli, steamed', '1 cup (156 g)', 55, 3.7, 11, 0.6, 'Vegetables'],
  ['Spinach, raw', '2 cups (60 g)', 14, 1.7, 2.2, 0.2, 'Vegetables'],
  ['Mixed salad greens', '2 cups (85 g)', 15, 1.2, 3, 0.2, 'Vegetables'],
  ['Carrots', '1 medium (61 g)', 25, 0.6, 6, 0.1, 'Vegetables'],
  ['Sweet potato, baked', '1 medium (114 g)', 103, 2.3, 24, 0.2, 'Vegetables'],
  ['Potato, baked', '1 medium (173 g)', 161, 4.3, 37, 0.2, 'Vegetables'],
  ['French fries', 'Medium serving (117 g)', 365, 4, 48, 17, 'Vegetables'],
  ['Bell pepper', '1 medium (119 g)', 31, 1, 7, 0.4, 'Vegetables'],
  ['Tomato', '1 medium (123 g)', 22, 1.1, 4.8, 0.2, 'Vegetables'],
  ['Cucumber', '1 cup sliced', 16, 0.7, 3.8, 0.1, 'Vegetables'],
  ['Green beans', '1 cup (125 g)', 44, 2.4, 10, 0.4, 'Vegetables'],
  ['Corn', '1 ear (90 g)', 88, 3.3, 19, 1.4, 'Vegetables'],
  ['Mushrooms, sautéed', '1 cup', 50, 3.5, 4, 3, 'Vegetables'],
  // Nuts, fats & spreads
  ['Almonds', '1 oz (28 g)', 164, 6, 6, 14, 'Nuts & fats'],
  ['Peanut butter', '2 tbsp (32 g)', 190, 7, 7, 16, 'Nuts & fats'],
  ['Walnuts', '1 oz (28 g)', 185, 4.3, 3.9, 18.5, 'Nuts & fats'],
  ['Mixed nuts', '1 oz (28 g)', 173, 5, 6, 16, 'Nuts & fats'],
  ['Olive oil', '1 tbsp (14 g)', 119, 0, 0, 13.5, 'Nuts & fats'],
  ['Hummus', '2 tbsp (30 g)', 70, 2, 4, 5, 'Nuts & fats'],
  ['Chia seeds', '1 tbsp (12 g)', 58, 2, 5, 3.7, 'Nuts & fats'],
  // Meals
  ['Chicken salad', '1 bowl', 400, 35, 15, 22, 'Meals'],
  ['Turkey sandwich', '1 sandwich', 350, 24, 38, 11, 'Meals'],
  ['Burrito bowl', '1 bowl', 650, 35, 75, 22, 'Meals'],
  ['Cheeseburger', '1 burger', 535, 30, 40, 28, 'Meals'],
  ['Pizza, cheese', '1 slice (107 g)', 285, 12, 36, 10, 'Meals'],
  ['Spaghetti with meat sauce', '1 plate', 560, 28, 70, 18, 'Meals'],
  ['Sushi roll (California)', '8 pieces', 260, 9, 38, 7, 'Meals'],
  ['Chicken stir-fry with rice', '1 plate', 550, 35, 65, 15, 'Meals'],
  ['Poke bowl', '1 bowl', 600, 32, 70, 20, 'Meals'],
  ['Pad thai', '1 plate', 650, 25, 85, 22, 'Meals'],
  ['Ramen', '1 bowl', 550, 20, 70, 20, 'Meals'],
  ['Tacos (2, chicken)', '2 tacos', 420, 28, 40, 16, 'Meals'],
  ['Caesar salad', '1 bowl', 360, 10, 14, 30, 'Meals'],
  ['Vegetable soup', '1 bowl (250 g)', 120, 4, 20, 3, 'Meals'],
  ['Smoothie (fruit + yogurt)', '16 oz', 300, 10, 55, 4, 'Meals'],
  ['Overnight oats', '1 jar', 350, 15, 50, 10, 'Meals'],
  ['Avocado toast', '1 slice', 260, 7, 26, 15, 'Meals'],
  // Snacks & sweets
  ['Dark chocolate', '1 oz (28 g)', 170, 2, 13, 12, 'Snacks'],
  ['Potato chips', '1 oz (28 g)', 150, 2, 15, 10, 'Snacks'],
  ['Popcorn, air-popped', '3 cups', 93, 3, 19, 1, 'Snacks'],
  ['Cookie, chocolate chip', '1 medium', 150, 2, 20, 7, 'Snacks'],
  ['Ice cream', '½ cup (66 g)', 137, 2.3, 16, 7, 'Snacks'],
  ['Rice cakes', '2 cakes', 70, 1.5, 15, 0.5, 'Snacks'],
  ['Energy gel', '1 gel', 100, 0, 25, 0, 'Snacks'],
  ['Trail mix', '¼ cup (38 g)', 175, 5, 17, 11, 'Snacks'],
  ['Muffin, blueberry', '1 medium', 380, 5, 54, 16, 'Snacks'],
  // Drinks
  ['Coffee, black', '1 cup', 2, 0.3, 0, 0, 'Drinks'],
  ['Latte (2% milk)', '12 oz', 150, 10, 15, 6, 'Drinks'],
  ['Orange juice', '1 cup (248 ml)', 112, 1.7, 26, 0.5, 'Drinks'],
  ['Soda', '12 oz can', 140, 0, 39, 0, 'Drinks'],
  ['Sports drink', '20 oz', 140, 0, 36, 0, 'Drinks'],
  ['Beer', '12 oz', 153, 1.6, 13, 0, 'Drinks'],
  ['Wine, red', '5 oz glass', 125, 0.1, 4, 0, 'Drinks'],
  ['Kombucha', '16 oz', 60, 0, 14, 0, 'Drinks'],
]

export const FOODS = RAW.map(([name, serving, cal, p, c, f, cat], i) => ({ id: `f${i}`, name, serving, cal, p, c, f, cat }))

export function searchFoods(query, limit = 30) {
  const q = query.trim().toLowerCase()
  if (!q) return FOODS.slice(0, limit)
  const words = q.split(/\s+/)
  return FOODS.filter((f) => words.every((w) => `${f.name} ${f.cat}`.toLowerCase().includes(w))).slice(0, limit)
}

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'snack', label: 'Snacks', emoji: '🍎' },
]

export function mealTypeForNow(date = new Date()) {
  const h = date.getHours()
  if (h < 10.5) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h >= 17 && h < 21.5) return 'dinner'
  return 'snack'
}

export const PROTEIN_IDEAS = ['Greek yogurt (17 g)', 'Chicken breast (46 g)', 'Protein shake (24 g)', 'Cottage cheese (24 g)', 'Lentils (18 g)', 'Tofu (20 g)', 'Tuna (33 g)', 'Eggs (12 g)']
