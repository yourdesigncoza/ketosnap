/* The 7-day keto-style plan, the weekly shop, the house rules and the recipes. Monday is Day 1, Sunday is Day 7.
   A few simple meals on repeat: Monday = Thursday, Tuesday = Friday, Wednesday = Saturday, Sunday is braai day.
   A meal is [label, text, photo]: the photo goes behind the meal on its card (see `photo` below).
   A to-do is a string, or [text, recipeId] when it links to a recipe below.
   The app reads everything from here; the shared plan page (keto/keto-week.html in thisandthat) mirrors it. */
self.KETO_PLAN = {
  carbs: '20 to 50 g net carbs a day',
  photo: (id) => `img/meals/${id}.jpg`,
  carbLow: 20,
  carbHigh: 50,

  days: [
    {
      name: 'Monday', kind: 'Spin day',
      meals: [
        ['Breakfast', '3 eggs scrambled in 1 tsp butter with ½ cup spinach (from frozen), ½ avo', 'eggs-scrambled'],
        ['Lunch', '1 tin tuna (drained and rinsed) with 1 tbsp mayo, a big handful of shredded cabbage and a squeeze of lemon', 'tuna-cabbage'],
        ['Dinner', '2 chicken thighs from the air fryer, 2 cups broccoli (from frozen) with 1 tsp butter', 'chicken-broccoli'],
      ],
      todo: [
        ['Tonight, cook 4 chicken thighs in the air fryer. Eat 2 and keep 2 for Tuesday\'s lunch.', 'chicken-thighs'],
        ['Then do 8 eggs in the air fryer for this week\'s boiled eggs. In their shells they keep a week in the fridge.', 'boiled-eggs'],
        ['Shred a quarter of the cabbage into a covered tub. It keeps 3 to 4 days.', 'cabbage-slaw'],
      ],
    },
    {
      name: 'Tuesday', kind: 'Spin day',
      meals: [
        ['Breakfast', '3 boiled eggs, ½ avo, black pepper and a squeeze of lemon', 'eggs-boiled'],
        ['Lunch', '2 leftover chicken thighs with slaw: 1 cup shredded cabbage, 1 tsp olive oil and lemon', 'chicken-slaw'],
        ['Dinner', 'One bowl of mince and cabbage pot (about 250 g mince)', 'mince-pot'],
      ],
      todo: [
        ['Tonight, make the mince and cabbage pot on the stove. It makes 4 bowls: eat 1, keep 1 in the fridge for Wednesday\'s lunch and freeze 2.', 'mince-pot'],
      ],
    },
    {
      name: 'Wednesday', kind: 'Spin day',
      meals: [
        ['Breakfast', '3-egg omelette with ½ cup spinach (from frozen) and 30 g cheese, cooked in 1 tsp butter', 'omelette'],
        ['Lunch', 'One bowl of mince and cabbage pot from the fridge', 'mince-pot'],
        ['Dinner', '2 hake fillets (about 200 g) from the air fryer with lemon and 1 tsp butter, 2 cups broccoli (from frozen)', 'hake-broccoli'],
      ],
      todo: [
        ['Tonight, cook the hake straight from frozen in the air fryer.', 'hake'],
        'Before bed, move 4 chicken thighs and the 2 tubs of mince from the freezer to the fridge.',
      ],
    },
    {
      name: 'Thursday', kind: 'Spin day',
      meals: [
        ['Breakfast', '3 eggs scrambled in 1 tsp butter with ½ cup spinach (from frozen), ½ avo', 'eggs-scrambled'],
        ['Lunch', '1 tin tuna (drained and rinsed) with 1 tbsp mayo, a big handful of shredded cabbage and a squeeze of lemon', 'tuna-cabbage'],
        ['Dinner', '2 chicken thighs from the air fryer, 2 cups broccoli (from frozen) with 1 tsp butter', 'chicken-broccoli'],
      ],
      todo: [
        ['Tonight, cook the 4 chicken thighs in the air fryer, the same as Monday. Keep 2 for Friday\'s lunch.', 'chicken-thighs'],
        ['Shred more cabbage if the tub is empty.', 'cabbage-slaw'],
      ],
    },
    {
      name: 'Friday', kind: 'Spin day',
      meals: [
        ['Breakfast', '3 boiled eggs, ½ avo, black pepper and a squeeze of lemon', 'eggs-boiled'],
        ['Lunch', '2 leftover chicken thighs with slaw: 1 cup shredded cabbage, 1 tsp olive oil and lemon', 'chicken-slaw'],
        ['Dinner', 'One bowl of mince and cabbage pot (from the freezer)', 'mince-pot'],
      ],
      todo: [
        'Shopping day. At home, keep 2 chicken thighs in the fridge for Sunday\'s braai. Put the other 8 in two freezer bags of 4, squeeze out the air and freeze them: one bag for Monday, one for Thursday.',
        'If the mince use-by date is before Tuesday, freeze it too.',
      ],
    },
    {
      name: 'Saturday', kind: 'Rest day',
      meals: [
        ['Breakfast', '3-egg omelette with ½ cup spinach (from frozen) and 30 g cheese, cooked in 1 tsp butter', 'omelette'],
        ['Lunch', 'The last bowl of mince and cabbage pot', 'mince-pot'],
        ['Dinner', '2 hake fillets (about 200 g) from the air fryer with lemon and 1 tsp butter, 2 cups broccoli (from frozen)', 'hake-broccoli'],
      ],
      todo: [
        ['Tonight, cook the hake the same as Wednesday.', 'hake'],
      ],
    },
    {
      name: 'Sunday', kind: 'Rest day',
      meals: [
        ['Breakfast', '2 eggs fried in 1 tsp butter, ½ cup spinach (from frozen), ½ avo', 'eggs-fried'],
        ['Lunch', 'Braai: 2 chicken thighs (or a steak or 2 lamb chops), slaw with lemon and 1 tsp olive oil', 'braai-chicken'],
        ['Dinner', 'Keep it light: 1 tin tuna with 1 tbsp mayo and shredded cabbage', 'tuna-cabbage'],
      ],
      todo: [
        ['Season the braai chicken with lemon, garlic, sweet paprika and pepper. Skip braai salt and braai spice: they are mostly salt.', 'chicken-thighs'],
        'Before bed, move one bag of 4 chicken thighs from the freezer to the fridge for Monday. If you froze the mince, move it too, for Tuesday.',
      ],
    },
  ],

  // Shown on the Week screen and sent to the model with every meal check.
  guides: [
    { title: 'Use your hand as a guide', items: [
      'Protein: the size of your palm, about 150 to 200 g cooked, or 3 eggs',
      'Vegetables: half the plate. Broccoli, spinach and cabbage can be topped up',
      'Butter or oil: the tip of your thumb, about 1 tsp per meal',
      'Cheese: matchbox size, about 30 g',
      'Mayonnaise: 1 tbsp',
      'Swaps are fine: a steak or 2 lamb chops for the chicken, any plain fish for the hake',
    ] },
    { title: 'When you\'re still hungry', items: [
      'Drink a glass of water and wait 15 minutes',
      'Still hungry? Add more green veg, cabbage or a boiled egg',
      'Don\'t top up with cheese, butter or mayo. They\'re easy to overdo',
      'Eat slowly and stop when you\'re satisfied, not full',
    ] },
    { title: 'Snacks if needed (one a day)', items: [
      '1 boiled egg',
      '30 g cheese (matchbox size)',
      '½ avo with lemon and pepper',
    ] },
    { title: 'Drinks', items: [
      'Water, plenty of it',
      'Rooibos, tea or coffee, with a splash of milk if you like',
      'No sugar in drinks',
    ] },
    { title: 'Cut out', items: [
      'Bread, pap, rice, pasta, potatoes',
      'Sugar, sweets, cake and biscuits',
      'Fruit juice and fizzy drinks',
      'Tomato sauce, chutney and bottled sauces',
      'Chilli and hot spices, like peri-peri, cayenne and hot curry. Sweet peppers and onions are fine',
      'Stock cubes, gravy and soup powders (very salty)',
      'Braai salt, braai spice and chicken spice (very salty)',
      'Biltong and boerewors (very salty)',
      'Polony, viennas and smoked snoek (very salty)',
    ] },
    { title: 'Go easy on', items: [
      'Salt: none at the table. Taste first, then use lemon, garlic, pepper or herbs',
      'Tinned fish in brine: drain and rinse it',
      'Feta and halloumi, the saltiest cheeses',
      'Bacon and ham',
      'Nuts: a small handful at most',
      'Fruit: a few berries now and then',
      'Carrots and tomato: a little is fine',
    ] },
    { title: 'The first week', items: [
      'Expect a few tired days and weaker spin sessions while your body adapts. It usually passes within one to two weeks.',
      'Drink about 2 litres of water a day. Avo, spinach, broccoli and cabbage put back minerals the body loses early on.',
      'Many keto guides say to add salt in the first week. If you have high blood pressure or take any medication, check with your doctor or clinic first, and tell them if you feel dizzy when you stand up.',
    ] },
  ],

  // Opened from a to-do as "How to make ...". Not sent to the model. Air fryer first (a basic 4 litre basket);
  // `oven` is a fallback and is left out where it doesn't help.
  recipes: {
    'chicken-thighs': {
      title: 'Chicken thighs',
      makes: '4 thighs (2 meals)',
      airfryer: '190°C, 24 to 26 minutes, turned halfway',
      oven: '200°C, or 180°C on a fan oven, 40 to 45 minutes on a baking tray',
      time: 'About 35 minutes',
      ingredients: [
        '4 fresh chicken thighs, skin on (about 700 g)',
        '1 tsp olive oil',
        '½ lemon',
        '1 clove garlic',
        '½ tsp sweet paprika',
        'Black pepper',
      ],
      steps: [
        'Pat the thighs dry with paper towel. Dry skin goes crispy.',
        'Peel the garlic and chop it very small. In a bowl, mix it with the oil, the juice of the half lemon, the paprika and a few twists of pepper.',
        'Rub the mix all over the thighs with your hands. Wash your hands with soap after touching raw chicken.',
        'Turn the air fryer to 190°C and let it heat for 3 minutes with the empty basket in.',
        'Put the thighs in the basket skin side down, in one layer. 4 fit in a 4 litre basket if they don\'t overlap. If they do, cook 2 at a time.',
        'Cook 12 minutes. Pull out the basket, turn each thigh skin side up with tongs, and cook 12 to 14 minutes more.',
        'Check the biggest one: cut into it next to the bone. The juice must run clear and the meat must be white, with no pink. If you see pink, cook 5 minutes more and check again.',
        'Let them rest 5 minutes, then eat 2.',
        'Let the other 2 cool for no more than an hour, then put them in a covered tub in the fridge. They keep 3 days.',
        'Broccoli for tonight: put 2 cups of frozen broccoli in a bowl with 2 tbsp water, cover with a plate and microwave on high for 4 to 5 minutes. Or boil it in a little water in a pot for 5 minutes. Drain and add 1 tsp butter.',
      ],
      tips: [
        'Air fryer basics: heat it for 3 minutes first, keep the food in one layer, and shake or turn halfway. Never use spray oil on the basket: it ruins the non-stick. Rub the oil on the food instead.',
        'Every air fryer is a bit different. The first time, check the chicken 5 minutes early.',
        'On the braai: medium coals, where you can hold your hand just above the grid for about 5 seconds. Braai 30 to 35 minutes, turning often, and check for pink at the bone the same way.',
        'Leftover thighs are fine cold, or warm them in the air fryer at 180°C for 5 minutes.',
      ],
    },
    'boiled-eggs': {
      title: 'Boiled eggs in the air fryer',
      makes: '8 eggs',
      airfryer: '130°C, 15 to 17 minutes',
      time: 'About 30 minutes, with cooling',
      ingredients: [
        '8 large eggs, straight from the fridge',
        'A big bowl of cold water and a few ice cubes',
      ],
      steps: [
        'Turn the air fryer to 130°C and let it heat for 3 minutes.',
        'Put the eggs in the basket in one layer. 8 fit in a 4 litre basket.',
        'Cook 15 minutes.',
        'While they cook, fill a big bowl with cold water and a few ice cubes.',
        'Lift the hot eggs into the cold water with a spoon or tongs. Leave them for 10 minutes. This stops the cooking and makes them easier to peel.',
        'Dry them and put them back in the egg tray in the fridge, in their shells. Write "boiled" on the tray so you don\'t mix them up. They keep 7 days.',
        'To peel: tap the egg all over on the counter, roll it under your hand, and start peeling at the fat end. Peeling under the cold tap helps.',
      ],
      tips: [
        'Air fryers differ. The first time, peel one egg: if the yolk is still soft in the middle, give them 2 minutes more next time.',
        'A small brown spot on a shell or on the white is normal in an air fryer.',
        'No air fryer free? Put the eggs in a pot, cover them with cold water, bring it to the boil, then let it bubble gently for 10 minutes. Cool them in cold water the same way.',
        'Eggs that are a week or two old peel more easily than very fresh ones.',
      ],
    },
    'mince-pot': {
      title: 'Mince and cabbage pot',
      makes: '4 bowls',
      time: 'About 40 minutes, on the stove',
      ingredients: [
        '1 kg lean beef mince',
        '1 onion',
        '2 cloves garlic',
        '¼ cabbage (about 300 g), shredded',
        '1 cup water (250 ml)',
        '1 tsp olive oil',
        '1 tsp sweet paprika',
        '1 tsp mixed herbs',
        'Black pepper',
      ],
      steps: [
        'Get everything ready first. Peel the onion and chop it small. Peel the garlic and chop it very small. Shred the cabbage (see "Shredded cabbage and slaw").',
        'Put your biggest pot on the stove on medium-high. Add the oil and the onion. Stir now and then for 5 minutes, until the onion is soft.',
        'Add the mince. Break it up with a wooden spoon as it cooks. Keep stirring and breaking it for 8 to 10 minutes, until there is no pink left.',
        'If there is a lot of fat in the pot, tilt it and spoon some out into an old tin or cup. Don\'t pour fat down the sink.',
        'Stir in the garlic, paprika, mixed herbs and a good few twists of pepper. Cook 1 minute.',
        'Add the cabbage and the water and stir. Put the lid on and turn the heat down to low. Cook 15 minutes, stirring now and then, until the cabbage is soft. If it gets dry, add a little more water.',
        'Taste it. Add more pepper or a squeeze of lemon if you like. It doesn\'t need salt or a stock cube.',
        'Share it out into 4 even bowls or tubs. Eat 1 now. Let the rest cool for no more than an hour.',
        'Put 1 tub in the fridge for Wednesday and 2 in the freezer for Friday and Saturday. Write the date on the lids.',
      ],
      tips: [
        'Fridge: 3 days. Freezer: 3 months.',
        'Thaw frozen tubs in the fridge overnight, never on the counter.',
        'Reheat in the microwave, stirring halfway, until it is steaming hot all the way through.',
        'If you have a sweet pepper (red, green or yellow), chop it and add it with the cabbage.',
      ],
    },
    'hake': {
      title: 'Hake from frozen',
      makes: '1 meal',
      airfryer: '190°C, 12 to 15 minutes',
      oven: '200°C, or 180°C on a fan oven, 20 to 25 minutes on a baking tray',
      time: 'About 20 minutes',
      ingredients: [
        '2 frozen hake fillets (about 200 g), no need to thaw',
        '½ tsp olive oil',
        '½ lemon',
        '1 tsp butter',
        'Black pepper',
        '2 cups frozen broccoli',
      ],
      steps: [
        'Turn the air fryer to 190°C and let it heat for 3 minutes.',
        'Take 2 fillets out of the box. Rinse off any ice under the cold tap and pat them dry with paper towel.',
        'Rub the oil on both sides and grind some pepper over.',
        'Lay them in the basket skin side down, side by side, not overlapping. 2 fillets fit easily.',
        'Cook 12 minutes. Don\'t turn them: hake breaks easily.',
        'Check the thickest part with a fork. It is done when it is white all the way through and flakes apart. If the middle still looks see-through, cook 2 or 3 minutes more.',
        'Lift them out with an egg lifter. Put the butter on top and squeeze the lemon over.',
        'Broccoli: put 2 cups of frozen broccoli in a bowl with 2 tbsp water, cover with a plate and microwave on high for 4 to 5 minutes. Or boil it in a little water in a pot for 5 minutes. Drain.',
      ],
      tips: [
        'If the fish sticks, next time put a piece of baking paper under it, a little smaller than the basket. Only put the paper in with the fish on it: on its own it can blow onto the heating element.',
        'Thin fillets cook faster. The first time, check at 10 minutes.',
        'Buy plain fillets, not crumbed or battered: those have flour and more salt.',
        'Close the box or bag well. The rest keeps in the freezer for 3 months.',
      ],
    },
    'cabbage-slaw': {
      title: 'Shredded cabbage and slaw',
      makes: 'Enough for 3 or 4 days',
      time: 'About 10 minutes',
      ingredients: [
        '¼ cabbage',
        'For each bowl of slaw: 1 cup shredded cabbage, 1 tsp olive oil, a squeeze of lemon and black pepper',
      ],
      steps: [
        'Pull off any tired outer leaves and rinse the cabbage.',
        'On a board, with a big sharp knife, cut the cabbage in half from top to bottom, through the hard stem. Cut one half in half again: that is your quarter. Wrap the rest in cling wrap or a bag and put it back in the fridge.',
        'Cut the hard white core out of the corner of your quarter.',
        'Lay it flat side down and slice it across as thinly as you can, into fine ribbons. Keep your fingertips curled under, away from the blade.',
        'Put it in a tub, lay a sheet of paper towel on top to soak up moisture, close the lid and keep it in the fridge. It keeps 3 to 4 days.',
        'Slaw: just before you eat, put 1 cup of shredded cabbage in a bowl, add 1 tsp olive oil, a squeeze of lemon and some pepper, and mix.',
      ],
      tips: [
        'Only add the oil and lemon when you eat it. Dressed cabbage goes soggy.',
        'A whole cabbage keeps about two weeks in the vegetable drawer.',
        'In a hurry? Shops sell bags of ready-shredded cabbage or coleslaw mix without dressing. Fine to use, but they only keep a few days.',
      ],
    },
  },

  shopNote: 'Shop on Friday. Each week you only need the first list; the others last longer, so tick them off while you still have some. Buy fresh chicken, not frozen: frozen chicken pieces are often injected with salty brine. Skip any pack that says "brine" on the label.',

  // [item, quantity]; an empty quantity means buy per bottle or jar.
  shop: [
    { title: 'Every week', items: [
      ['Chicken thighs, fresh', '10 (about 1.8 kg)'],
      ['Lean beef mince', '1 kg'],
      ['Tuna in water or brine', '3 tins (170 g each)'],
      ['Eggs', '1 tray of 30'],
      ['Milk', '1 litre'],
      ['Cabbage', '1 medium head'],
      ['Avocados', '3 (one ripe, two firm)'],
      ['Lemons', '4'],
      ['Frozen broccoli', '1 bag (1 kg). A broccoli and cauliflower mix is fine'],
    ] },
    { title: 'Every 2 or 3 weeks', items: [
      ['Frozen hake fillets, plain', '1 box (800 g)'],
      ['Frozen chopped spinach', '1 bag (1 kg)'],
      ['Cheese, mozzarella or cheddar', '1 block (about 250 g)'],
      ['Onions', '2 or 3'],
      ['Garlic', '1 bulb'],
    ] },
    { title: 'Every month or so', items: [
      ['Butter', '1 block (250 g)'],
      ['Olive oil', ''],
      ['Mayonnaise', ''],
      ['Black pepper, sweet paprika, mixed herbs', 'No salt added'],
      ['Rooibos tea', ''],
    ] },
  ],
};
